import { Service } from 'typedi';
import { UserService } from '@/services/user.service';
import type { AssignableRole, User } from '@/databases/entities/User';

/**
 * Exposes functionality to be used by the cloud BE hooks.
 * DO NOT DELETE any of the methods without making sure this is not used in cloud BE hooks.
 */
@Service()
export class HooksService {
	constructor(private userService: UserService) {}

	/**
	 * Invites users to the instance.
	 * This method is used in the cloud BE hooks, to invite members during sign-up
	 */
	async inviteUsers(owner: User, attributes: Array<{ email: string; role: AssignableRole }>) {
		return await this.userService.inviteUsers(owner, attributes);
	}
}
