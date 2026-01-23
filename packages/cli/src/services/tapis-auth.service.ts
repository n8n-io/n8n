import axios from 'axios';
import { Service, Container } from '@n8n/di';
import * as bcrypt from 'bcryptjs';
import { 
    User, 
    UserRepository, 
    RoleRepository, 
    ProjectRepository, 
    ProjectRelationRepository,
    Project
} from '@n8n/db';

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load specific file ".env.tapis"
dotenv.config({ path: path.resolve(process.cwd(), '.env.tapis') });


@Service()
export class TapisAuthService {
    // private readonly TAPIS_API_URL = 'https://portals.tapis.io/v3/oauth2/tokens';
    private readonly TAPIS_BASE_URL = process.env.TAPIS_BASE_URL || 'https://portals.tapis.io';
    private readonly TAPIS_AUTH_ENDPOINT = process.env.TAPIS_AUTH_ENDPOINT || '/v3/oauth2/';

    private get TAPIS_API_URL(): string {
        // Remove / left in URL
        const base = this.TAPIS_BASE_URL.replace(/\/$/, '');
        const endpoint = this.TAPIS_AUTH_ENDPOINT.replace(/^\//, '');
        return `${base}/${endpoint}`;
    }

    async authenticateWithTapis(username: string, password: string): Promise<User | null> {
        try {
            // 1. Authenticate with Tapis API
            await axios.post(this.TAPIS_API_URL, {
                username,
                password,
                grant_type: 'password',
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Build new N8N User
            const userRepository = Container.get(UserRepository);
            const roleRepository = Container.get(RoleRepository);
            const projectRepository = Container.get(ProjectRepository);
            const projectRelationRepository = Container.get(ProjectRelationRepository);
            const tapisEmail = `${username}@tacc.utexas.edu`;

            // 2. Search if user exists
            let user = await userRepository.findOne({ 
                where: { email: tapisEmail },
                relations: ['role']
            });

            if (!user) {
                console.log(`[TapisAuth] Creating record for: ${username}`);

                // A. Obtain global:Owner role (Prevent isPending be True based on Entity)
                let defaultRole = await roleRepository.findOne({ where: { slug: 'global:owner' } });
                if (!defaultRole) {
                    defaultRole = await roleRepository.findOne({ where: { slug: 'admin' } });
                }

                // Encrypt password
                const hashedPassword = await bcrypt.hash(password, 10);

                // B. Create User following the User Entity rules
                const newUser = userRepository.create({
                    email: tapisEmail,
                    firstName: username,
                    lastName: '(Tapis)',
                    password: hashedPassword, // Save encrypted password
                    role: defaultRole,
                    roleSlug: defaultRole?.slug || 'global:owner',
                } as any);

                (newUser as any).active = true;
                
                // Required Metadata
                (newUser as any).settings = { 
                    userActivated: true,
                    dashboard: {},
                    workspaces: { currentWorkspaceId: undefined }
                };

                (newUser as any).personalizationAnswers = { 
                    version: "v4",
                    completed: true,
                    answers: {} 
                };

                user = (await userRepository.save(newUser as any)) as any as User;

                // C. Create a Personal Project with the desided name by createPersonalProjectName()
                // Format: First Last <email>
                const projectName = `${username} (Tapis) <${tapisEmail}>`;

                const project = (await projectRepository.save(
                    projectRepository.create({
                        name: projectName,
                        type: 'personal',
                        creatorId: user.id,
                    } as any) as any
                )) as any as Project;

                // 2. Create the relationship
                await projectRelationRepository.save(
                    projectRelationRepository.create({
                        userId: user.id,
                        projectId: project.id,
                        role: 'project:personalOwner',
                    } as any) as any
                );

                // console.log(`[TapisAuth] Project created with ID: ${project.id} and Creator: ${user.id}`);

                // E. Reload to make sure the returned Object has all the relations
                user = await userRepository.findOne({
                    where: { id: user.id },
                    relations: ['role']
                }) as User;

                // Wait to make sure SQLite saved the changes
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            return user;
        } catch (error) {
            console.error('Tapis Auth System Error:', error.response?.data || error.message);
            return null;
        }
    }
}
