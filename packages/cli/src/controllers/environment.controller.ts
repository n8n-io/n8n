import { Get, Post, RestController } from '@/decorators';
import { EnvironmentService } from '@/Environment/EnvironmentService.ee';
import { EnvironmentConfiguration } from '@/Environment/types';
import { BadRequestError } from '@/ResponseHelper';

@RestController('/environment')
export class EnvironmentController {
	constructor(
		private environmentService: EnvironmentService, // private ldapSync: LdapSync, // private internalHooks: InternalHooks,
	) {}

	@Post('/init-ssh')
	async initSsh(req: EnvironmentConfiguration.InitSsh) {
		try {
			await this.environmentService.setEnvironmentPreferences(req.body);
			return await this.environmentService.getSshPublicKey(req.body.email);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/init-repository')
	async initRepository(req: EnvironmentConfiguration.InitRepository) {
		try {
			await this.environmentService.initGit();
			await this.environmentService.initRepository();
			return await this.environmentService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/push')
	async push(req: EnvironmentConfiguration.Push) {
		try {
			await this.environmentService.push(req.body.message);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/pull')
	async pull(req: EnvironmentConfiguration.Pull) {
		try {
			await this.environmentService.initGit();
			await this.environmentService.pull();
		} catch (error) {
			console.log(error);
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/get-branches')
	async getBranches() {
		try {
			return await this.environmentService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/set-branch')
	async changeBranch(req: EnvironmentConfiguration.SetBranch) {
		try {
			await this.environmentService.setBranch(req.body.branch);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/config')
	async getConfig() {
		const branches = await this.environmentService.getBranches();
		return {
			...this.environmentService.config,
			currentBranch: branches.currentBranch,
		};
	}
}
