import type { FrontendSettings, UserUpdateRequestDto } from '@n8n/api-types';
import type { ClientOAuth2Options } from '@n8n/client-oauth2';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ErrorReporter, Logger } from 'n8n-core';
import type { IRun, IWorkflowBase, Workflow, WorkflowExecuteMode } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import type clientOAuth1 from 'oauth-1.0a';

import type { AbstractServer } from '@/abstract-server';
import type { Config } from '@/config';
import type { TagEntity } from '@/databases/entities/tag-entity';
import type { User } from '@/databases/entities/user';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { ICredentialsDb, PublicUser } from '@/interfaces';

type Repositories = {
	User: UserRepository;
	Settings: SettingsRepository;
	Credentials: CredentialsRepository;
	Workflow: WorkflowRepository;
};

type ExternalHooksMap = {
	'n8n.ready': [server: AbstractServer, config: Config];
	'n8n.stop': never;
	'worker.ready': never;

	'activeWorkflows.initialized': never;

	'credentials.create': [encryptedData: ICredentialsDb];
	'credentials.update': [newCredentialData: ICredentialsDb];
	'credentials.delete': [credentialId: string];

	'frontend.settings': [frontendSettings: FrontendSettings];

	'mfa.beforeSetup': [user: User];

	'oauth1.authenticate': [
		oAuthOptions: clientOAuth1.Options,
		oauthRequestData: { oauth_callback: string },
	];
	'oauth2.authenticate': [oAuthOptions: ClientOAuth2Options];
	'oauth2.callback': [oAuthOptions: ClientOAuth2Options];

	'tag.beforeCreate': [tag: TagEntity];
	'tag.afterCreate': [tag: TagEntity];
	'tag.beforeUpdate': [tag: TagEntity];
	'tag.afterUpdate': [tag: TagEntity];
	'tag.beforeDelete': [tagId: string];
	'tag.afterDelete': [tagId: string];

	'user.deleted': [user: PublicUser];
	'user.profile.beforeUpdate': [
		userId: string,
		currentEmail: string,
		payload: UserUpdateRequestDto,
	];
	'user.profile.update': [currentEmail: string, publicUser: PublicUser];
	'user.password.update': [updatedEmail: string, updatedPassword: string];
	'user.invited': [emails: string[]];

	'workflow.create': [createdWorkflow: IWorkflowBase];
	'workflow.afterCreate': [createdWorkflow: IWorkflowBase];
	'workflow.activate': [updatedWorkflow: IWorkflowBase];
	'workflow.update': [updatedWorkflow: IWorkflowBase];
	'workflow.afterUpdate': [updatedWorkflow: IWorkflowBase];
	'workflow.delete': [workflowId: string];
	'workflow.afterDelete': [workflowId: string];

	'workflow.preExecute': [workflow: Workflow, mode: WorkflowExecuteMode];
	'workflow.postExecute': [
		fullRunData: IRun | undefined,
		workflowData: IWorkflowBase,
		executionId: string,
	];
};
type HookNames = keyof ExternalHooksMap;

// TODO: Derive this type from Hooks
interface IExternalHooksFileData {
	[Resource: string]: {
		[Operation: string]: Array<(...args: unknown[]) => Promise<void>>;
	};
}

@Service()
export class ExternalHooks {
	private readonly registered: {
		[hookName in HookNames]?: Array<(...args: ExternalHooksMap[hookName]) => Promise<void>>;
	} = {};

	private readonly dbCollections: Repositories;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly globalConfig: GlobalConfig,
		userRepository: UserRepository,
		settingsRepository: SettingsRepository,
		credentialsRepository: CredentialsRepository,
		workflowRepository: WorkflowRepository,
	) {
		this.dbCollections = {
			User: userRepository,
			Settings: settingsRepository,
			Credentials: credentialsRepository,
			Workflow: workflowRepository,
		};
	}

	async init() {
		const externalHookFiles = this.globalConfig.externalHooks.files;

		// Load all the provided hook-files
		for (let hookFilePath of externalHookFiles) {
			hookFilePath = hookFilePath.trim();
			try {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const hookFile = require(hookFilePath) as IExternalHooksFileData;
				this.loadHooks(hookFile);
			} catch (e) {
				const error = e instanceof Error ? e : new Error(`${e}`);

				throw new ApplicationError('Problem loading external hook file', {
					extra: { errorMessage: error.message, hookFilePath },
					cause: error,
				});
			}
		}
	}

	private loadHooks(hookFileData: IExternalHooksFileData) {
		const { registered } = this;
		for (const [resource, operations] of Object.entries(hookFileData)) {
			for (const operation of Object.keys(operations)) {
				const hookName = `${resource}.${operation}` as HookNames;
				registered[hookName] ??= [];
				registered[hookName].push(...operations[operation]);
			}
		}
	}

	async run<HookName extends HookNames>(
		hookName: HookName,
		hookParameters?: ExternalHooksMap[HookName],
	): Promise<void> {
		const { registered, dbCollections } = this;
		const hookFunctions = registered[hookName];
		if (!hookFunctions?.length) return;

		const context = { dbCollections };

		for (const hookFunction of hookFunctions) {
			try {
				await hookFunction.apply(context, hookParameters);
			} catch (cause) {
				this.logger.error(`There was a problem running hook "${hookName}"`);
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const error = new ApplicationError(`External hook "${hookName}" failed`, { cause });
				this.errorReporter.error(error, { level: 'fatal' });
				throw error;
			}
		}
	}
}
