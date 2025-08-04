'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.CommunityPackagesController = void 0;
exports.isNpmError = isNpmError;
const constants_1 = require('@/constants');
const decorators_1 = require('@n8n/decorators');
const community_node_types_service_1 = require('./community-node-types.service');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const event_service_1 = require('@/events/event.service');
const push_1 = require('@/push');
const {
	PACKAGE_NOT_INSTALLED,
	PACKAGE_NAME_NOT_PROVIDED,
	PACKAGE_VERSION_NOT_FOUND,
	PACKAGE_DOES_NOT_CONTAIN_NODES,
	PACKAGE_NOT_FOUND,
} = constants_1.RESPONSE_ERROR_MESSAGES;
const isClientError = (error) =>
	[PACKAGE_VERSION_NOT_FOUND, PACKAGE_DOES_NOT_CONTAIN_NODES, PACKAGE_NOT_FOUND].some((msg) =>
		error.message.includes(msg),
	);
function isNpmError(error) {
	return typeof error === 'object' && error !== null && 'code' in error && 'stdout' in error;
}
let CommunityPackagesController = class CommunityPackagesController {
	constructor(push, communityPackagesService, eventService, communityNodeTypesService) {
		this.push = push;
		this.communityPackagesService = communityPackagesService;
		this.eventService = eventService;
		this.communityNodeTypesService = communityNodeTypesService;
	}
	async installPackage(req) {
		const { name, verify, version } = req.body;
		if (!name) {
			throw new bad_request_error_1.BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}
		let checksum = undefined;
		if (verify) {
			checksum = this.communityNodeTypesService.findVetted(name)?.checksum;
			if (!checksum) {
				throw new bad_request_error_1.BadRequestError(
					`Package ${name} is not vetted for installation`,
				);
			}
		}
		let parsed;
		try {
			parsed = this.communityPackagesService.parseNpmPackageName(name);
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(
				error instanceof Error ? error.message : 'Failed to parse package name',
			);
		}
		if (parsed.packageName === constants_1.STARTER_TEMPLATE_NAME) {
			throw new bad_request_error_1.BadRequestError(
				[
					`Package "${parsed.packageName}" is only a template`,
					'Please enter an actual package to install',
				].join('.'),
			);
		}
		const isInstalled = await this.communityPackagesService.isPackageInstalled(parsed.packageName);
		const hasLoaded = this.communityPackagesService.hasPackageLoaded(name);
		if (isInstalled && hasLoaded) {
			throw new bad_request_error_1.BadRequestError(
				[
					`Package "${parsed.packageName}" is already installed`,
					'To update it, click the corresponding button in the UI',
				].join('.'),
			);
		}
		const packageStatus = await this.communityPackagesService.checkNpmPackageStatus(name);
		if (packageStatus.status !== 'OK') {
			throw new bad_request_error_1.BadRequestError(
				`Package "${name}" is banned so it cannot be installed`,
			);
		}
		const packageVersion = version ?? parsed.version;
		let installedPackage;
		try {
			installedPackage = await this.communityPackagesService.installPackage(
				parsed.packageName,
				packageVersion,
				checksum,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : constants_1.UNKNOWN_FAILURE_REASON;
			this.eventService.emit('community-package-installed', {
				user: req.user,
				inputString: name,
				packageName: parsed.packageName,
				success: false,
				packageVersion,
				failureReason: errorMessage,
			});
			let message = [`Error loading package "${name}" `, errorMessage].join(':');
			if (error instanceof Error && error.cause instanceof Error) {
				message += `\nCause: ${error.cause.message}`;
			}
			const clientError = error instanceof Error ? isClientError(error) : false;
			throw new (
				clientError
					? bad_request_error_1.BadRequestError
					: internal_server_error_1.InternalServerError
			)(message);
		}
		if (!hasLoaded) this.communityPackagesService.removePackageFromMissingList(name);
		installedPackage.installedNodes.forEach((node) => {
			this.push.broadcast({
				type: 'reloadNodeType',
				data: {
					name: node.type,
					version: node.latestVersion,
				},
			});
		});
		this.eventService.emit('community-package-installed', {
			user: req.user,
			inputString: name,
			packageName: parsed.packageName,
			success: true,
			packageVersion,
			packageNodeNames: installedPackage.installedNodes.map((node) => node.name),
			packageAuthor: installedPackage.authorName,
			packageAuthorEmail: installedPackage.authorEmail,
		});
		return installedPackage;
	}
	async getInstalledPackages() {
		const installedPackages = await this.communityPackagesService.getAllInstalledPackages();
		if (installedPackages.length === 0) return [];
		let pendingUpdates;
		try {
			const command = ['npm', 'outdated', '--json'].join(' ');
			await this.communityPackagesService.executeNpmCommand(command, { doNotHandleError: true });
		} catch (error) {
			if (isNpmError(error) && error.code === 1) {
				pendingUpdates = JSON.parse(error.stdout);
			}
		}
		let hydratedPackages = this.communityPackagesService.matchPackagesWithUpdates(
			installedPackages,
			pendingUpdates,
		);
		try {
			if (this.communityPackagesService.hasMissingPackages) {
				hydratedPackages = this.communityPackagesService.matchMissingPackages(hydratedPackages);
			}
		} catch {}
		return hydratedPackages;
	}
	async uninstallPackage(req) {
		const { name } = req.query;
		if (!name) {
			throw new bad_request_error_1.BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}
		try {
			this.communityPackagesService.parseNpmPackageName(name);
		} catch (error) {
			const message = error instanceof Error ? error.message : constants_1.UNKNOWN_FAILURE_REASON;
			throw new bad_request_error_1.BadRequestError(message);
		}
		const installedPackage = await this.communityPackagesService.findInstalledPackage(name);
		if (!installedPackage) {
			throw new bad_request_error_1.BadRequestError(PACKAGE_NOT_INSTALLED);
		}
		try {
			await this.communityPackagesService.removePackage(name, installedPackage);
		} catch (error) {
			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : constants_1.UNKNOWN_FAILURE_REASON,
			].join(':');
			throw new internal_server_error_1.InternalServerError(message, error);
		}
		installedPackage.installedNodes.forEach((node) => {
			this.push.broadcast({
				type: 'removeNodeType',
				data: {
					name: node.type,
					version: node.latestVersion,
				},
			});
		});
		this.eventService.emit('community-package-deleted', {
			user: req.user,
			packageName: name,
			packageVersion: installedPackage.installedVersion,
			packageNodeNames: installedPackage.installedNodes.map((node) => node.name),
			packageAuthor: installedPackage.authorName,
			packageAuthorEmail: installedPackage.authorEmail,
		});
	}
	async updatePackage(req) {
		const { name, version, checksum } = req.body;
		if (!name) {
			throw new bad_request_error_1.BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}
		const previouslyInstalledPackage =
			await this.communityPackagesService.findInstalledPackage(name);
		if (!previouslyInstalledPackage) {
			throw new bad_request_error_1.BadRequestError(PACKAGE_NOT_INSTALLED);
		}
		try {
			const newInstalledPackage = await this.communityPackagesService.updatePackage(
				this.communityPackagesService.parseNpmPackageName(name).packageName,
				previouslyInstalledPackage,
				version,
				checksum,
			);
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast({
					type: 'removeNodeType',
					data: {
						name: node.type,
						version: node.latestVersion,
					},
				});
			});
			newInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast({
					type: 'reloadNodeType',
					data: {
						name: node.type,
						version: node.latestVersion,
					},
				});
			});
			this.eventService.emit('community-package-updated', {
				user: req.user,
				packageName: name,
				packageVersionCurrent: previouslyInstalledPackage.installedVersion,
				packageVersionNew: newInstalledPackage.installedVersion,
				packageNodeNames: newInstalledPackage.installedNodes.map((n) => n.name),
				packageAuthor: newInstalledPackage.authorName,
				packageAuthorEmail: newInstalledPackage.authorEmail,
			});
			return newInstalledPackage;
		} catch (error) {
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast({
					type: 'removeNodeType',
					data: {
						name: node.type,
						version: node.latestVersion,
					},
				});
			});
			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : constants_1.UNKNOWN_FAILURE_REASON,
			].join(':');
			throw new internal_server_error_1.InternalServerError(message, error);
		}
	}
};
exports.CommunityPackagesController = CommunityPackagesController;
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.GlobalScope)('communityPackage:install'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CommunityPackagesController.prototype,
	'installPackage',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('communityPackage:list'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	CommunityPackagesController.prototype,
	'getInstalledPackages',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/'),
		(0, decorators_1.GlobalScope)('communityPackage:uninstall'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CommunityPackagesController.prototype,
	'uninstallPackage',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/'),
		(0, decorators_1.GlobalScope)('communityPackage:update'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CommunityPackagesController.prototype,
	'updatePackage',
	null,
);
exports.CommunityPackagesController = CommunityPackagesController = __decorate(
	[
		(0, decorators_1.RestController)('/community-packages'),
		__metadata('design:paramtypes', [
			push_1.Push,
			community_packages_service_1.CommunityPackagesService,
			event_service_1.EventService,
			community_node_types_service_1.CommunityNodeTypesService,
		]),
	],
	CommunityPackagesController,
);
//# sourceMappingURL=community-packages.controller.js.map
