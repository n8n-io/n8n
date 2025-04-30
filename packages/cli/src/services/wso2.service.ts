import { Container, Service } from '@n8n/di';
import { Application } from 'express';
import { BaseClient, Issuer, generators } from 'openid-client';
import session from 'express-session';
import { UserRepository } from '@/databases/repositories/user.repository';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { PasswordUtility } from './password.utility';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { AuthController } from '@/controllers/auth.controller';
import cookieParser from 'cookie-parser';
import { promisify } from 'util';
import { AuthenticatedRequest } from '@/requests';

@Service()
export class Wso2Service {
	public client: BaseClient | undefined = undefined;
	public revokeClick: BaseClient;

	constructor(private readonly passwordUtility: PasswordUtility) {
		this.initializeClient();
	}

	private async initializeClient() {
		if (
			process.env.WSO2_ISSUE &&
			process.env.WSO2_CLIENT_ID &&
			process.env.WSO2_CLIENT_SECRET &&
			process.env.WSO2_REDIRECT_URL &&
			process.env.WSO2_REDIRECT_SIGN_IN
		) {
			console.debug('WSO2 Init - current working dir:' + process.cwd());
			const issuer = await Issuer.discover(process.env.WSO2_ISSUE);

			this.client = new issuer.Client({
				client_id: process.env.WSO2_CLIENT_ID,
				client_secret: process.env.WSO2_CLIENT_SECRET,
				redirect_uris: [process.env.WSO2_REDIRECT_URL],
				revocation_endpoint_auth_method: 'client_secret_basic',
				response_types: ['code'],
				token_endpoint_auth_method: 'client_secret_basic', // O 'client_secret_post' se richiesto
			});
		}
	}

	async initWso2(app: Application) {
		if (this.client instanceof BaseClient) {
			app.use(cookieParser());
			app.use(
				session({
					secret: 'super-secret-psw',
					resave: false,
					saveUninitialized: false,
					cookie: {
						secure: false, // true solo se sei in HTTPS
						maxAge: 10 * 60 * 1000, // 10 minuti
					},
				}),
			);
			app.get('/signin', async (req, res) => {
				const code_verifier = generators.codeVerifier();
				const code_challenge = generators.codeChallenge(code_verifier);
				// console.debug(code_verifier)
				req.session.code_verifier = code_verifier; // salva per poi usarlo su `/callback`

				try {
					await promisify(req.session.save.bind(req.session))();
					const authorizationUrl = this.client!.authorizationUrl({
						scope: process.env.WSO2_SCOPE,
					});
					console.debug('Redirect verso: ' + authorizationUrl);
					res.redirect(authorizationUrl);
				} catch (err) {
					console.error('Errore nel salvataggio della sessione:', err);
					res.status(500).send('Errore nella sessione');
				}
			});
			app.get('/callback', async (req, res) => {
				const params = this.client!.callbackParams(req);
				if (!req.session.code_verifier) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
					res.redirect('/');
				}

				const tokenSet = await this.client!.callback(process.env.WSO2_REDIRECT_URL!, params, {
					code_verifier: req.session.code_verifier,
				});
				const userinfo: any = await this.client!.userinfo(tokenSet.access_token!);
				let usrExist = await Container.get(UserRepository).exists({
					where: { email: userinfo.username + process.env.WSO2_SUFIX },
				});
				if (!usrExist) {
					let usrObj = await Container.get(UserRepository).create({
						email: userinfo.username + process.env.WSO2_SUFIX,
						password: await this.passwordUtility.hash(userinfo.username),
						firstName: userinfo.username,
						lastName: userinfo.username,
						role: 'global:owner',
					});
					usrObj = await Container.get(UserRepository).save(usrObj);
					let usrProject = await Container.get(ProjectRepository).exists({
						where: { name: 'project_' + userinfo.username },
					});
					if (usrProject) {
						await Container.get(ProjectRepository).delete({ name: 'project_' + userinfo.username });
					}
					let projectObj = await Container.get(ProjectRepository).save(
						Container.get(ProjectRepository).create({
							type: 'personal',
							name: 'project_' + userinfo.username,
						}),
					);
					Container.get(ProjectRelationRepository).save(
						Container.get(ProjectRelationRepository).create({
							projectId: projectObj.id,
							userId: usrObj.id,
							role: 'project:personalOwner',
						}),
					);
				}

				// Salva sessione o token per utente
				req.session.user = userinfo;
				const authController = Container.get(AuthController);
				const fakeReq = Object.assign(req, {
					body: {
						emailOrLdapLoginId: userinfo.username + process.env.WSO2_SUFIX,
						password: userinfo.username,
					},
				});

				const loginResponse = await authController.login(fakeReq, res, fakeReq.body);
				//res.json(loginResponse); // oppure fai un redirect a frontend dopo aver salvato i cookie
				req.session.accessToken = tokenSet.access_token; // salva pe
				req.session.idToken = tokenSet.id_token;
				// console.debug("AccessoToken",  tokenSet.access_token)
				// console.debug("idToken",  tokenSet.id_token)
				res.redirect('/');
			});

			app.post('/rest/logout', async (req, res) => {
				const idToken = req.session.idToken;
				const accessToken = req.session.accessToken;

				// Chiama logout dell'app
				await Container.get(AuthController).logout(req as AuthenticatedRequest, res);

				// Distruggi la sessione Express
				req.session.destroy((err) => {
					if (err) {
						console.error('Errore distruggendo la sessione:', err);
					}
					// Reindirizza verso il logout OIDC di WSO2
					if (idToken) {
						const logoutUrl = this.client!.endSessionUrl({
							id_token_hint: idToken,
							post_logout_redirect_uri: process.env.WSO2_REDIRECT_SIGN_IN,
						});

						res.json({ data: { redirectTo: logoutUrl } });
					} else {
						res.json({});
					}
				});
			});
		}
	}
}
