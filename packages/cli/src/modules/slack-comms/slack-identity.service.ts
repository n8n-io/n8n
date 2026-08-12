import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export interface SlackUserLookup {
	getUserInfo(
		botToken: string,
		slackUserId: string,
	): Promise<{ email: string | null; tz: string | null }>;
}

export interface SlackIdentityResolution {
	user: User;
	tz: string | null;
}

@Service()
export class SlackIdentityService {
	constructor(
		private readonly userLookup: SlackUserLookup,
		private readonly userRepository: UserRepository,
	) {}

	async resolve(botToken: string, slackUserId: string): Promise<SlackIdentityResolution | null> {
		const { email, tz } = await this.userLookup.getUserInfo(botToken, slackUserId);
		if (!email) return null;

		const user = await this.userRepository.findOne({
			where: { email: email.toLowerCase() },
			relations: ['role'],
		});
		if (!user) return null;
		if (user.disabled) return null;
		if (user.password === null) return null;

		return { user, tz };
	}
}
