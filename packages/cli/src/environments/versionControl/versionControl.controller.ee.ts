import { Authorized, Get, Post, RestController } from '@/decorators';
import { versionControlLicensedMiddleware } from './middleware/versionControlEnabledMiddleware';
import { VersionControlService } from './versionControl.service.ee';
import { VersionControlRequest } from './types/requests';
import type { VersionControlPreferences } from './types/versionControlPreferences';
import { BadRequestError } from '@/ResponseHelper';
import type { PullResult, PushResult, StatusResult } from 'simple-git';

@RestController('/version-control')
export class VersionControlController {
	constructor(private versionControlService: VersionControlService) {}

	@Authorized('any')
	@Get('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async getPreferences(): Promise<VersionControlPreferences> {
		// returns the settings with the privateKey property redacted
		return this.versionControlService.versionControlPreferences;
	}

	@Authorized(['global', 'owner'])
	@Post('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async setPreferences(req: VersionControlRequest.UpdatePreferences) {
		try {
			const sanitizedPreferences: Partial<VersionControlPreferences> = {
				...req.body,
				connected: undefined,
				publicKey: undefined,
			};
			await this.versionControlService.validateVersionControlPreferences(sanitizedPreferences);
			const newPreferences = await this.versionControlService.setPreferences(sanitizedPreferences);
			await this.versionControlService.init();
			return newPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/connect')
	async connect() {
		try {
			return await this.versionControlService.connect();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/disconnect')
	async disconnect() {
		try {
			return await this.versionControlService.disconnect();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/get-branches')
	async getBranches() {
		try {
			return await this.versionControlService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/set-branch')
	async changeBranch(req: VersionControlRequest.SetBranch) {
		try {
			return await this.versionControlService.setBranch(req.body.branch);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/fetch')
	async fetch() {
		try {
			return await this.versionControlService.fetch();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/push')
	async push(): Promise<PushResult> {
		try {
			return await this.versionControlService.push();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/pull')
	async pull(): Promise<PullResult> {
		try {
			return await this.versionControlService.pull();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/stage')
	async stage(req: VersionControlRequest.Stage): Promise<StatusResult | string> {
		try {
			const files =
				req.body.files && req.body.files.length > 0 ? new Set<string>(req.body.files) : undefined;
			return await this.versionControlService.stage(files);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/unstage')
	async unstage(): Promise<StatusResult | string> {
		try {
			return await this.versionControlService.unstage();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/commit')
	async commit(req: VersionControlRequest.Commit) {
		try {
			return await this.versionControlService.commit(req.body.message);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/status')
	async status(): Promise<StatusResult> {
		try {
			return await this.versionControlService.status();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	//TODO: REMOVE THESE FUNCTIONS AFTER TESTING
	@Authorized(['global', 'owner'])
	@Get('/generateKeyPair', { middlewares: [versionControlLicensedMiddleware] })
	async generateKeyPair() {
		try {
			return await this.versionControlService.generateAndSaveKeyPair();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/export', { middlewares: [versionControlLicensedMiddleware] })
	async export() {
		try {
			return await this.versionControlService.export();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/import', { middlewares: [versionControlLicensedMiddleware] })
	async import() {
		try {
			return await this.versionControlService.import();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}
