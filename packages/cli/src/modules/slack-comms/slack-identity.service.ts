import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export interface SlackEmailLookup {
	getUserEmail(botToken: string, slackUserId: string): Promise<string | null>;
}

@Service()
export class SlackIdentityService {
	constructor(
		private readonly emailLookup: SlackEmailLookup,
		private readonly userRepository: UserRepository,
	) {}

	async resolve(botToken: string, slackUserId: string): Promise<User | null> {
		const email = await this.emailLookup.getUserEmail(botToken, slackUserId);
		if (!email) return null;

		const user = await this.userRepository.findOne({
			where: { email: email.toLowerCase() },
			relations: ['role'],
		});
		if (!user) return null;
		if (user.disabled) return null;
		if (user.password === null) return null;

		return user;
	}
}
