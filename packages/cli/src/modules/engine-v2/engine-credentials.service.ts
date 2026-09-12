import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject, IExecuteData } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type { ResolveCredentialRequest } from './engine-credentials.contract';

/**
 * `getDecrypted` reads the consumer node type for the policy check from
 * `executeData.node.type`. The data plane sends the type only, so the rest of
 * the node is a placeholder. Nothing else in `getDecrypted` reads it: the node
 * has no parameters, so credential expressions resolve as they do with no
 * `executeData` at all.
 */
function toExecuteData(nodeType: string): IExecuteData {
	return {
		node: { id: '', name: '', type: nodeType, typeVersion: 0, position: [0, 0], parameters: {} },
		data: {},
		source: null,
	};
}

/**
 * Resolves a credential for the engine 2.0 data plane. The data plane has no
 * credential store and no encryption key, so this is the only place where a
 * step's credential is decrypted.
 */
@Service()
export class EngineCredentialsService {
	constructor(
		private readonly permissionChecker: CredentialsPermissionChecker,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/**
	 * Throws `ForbiddenError` when the credential is not shared with one of the
	 * workflow's projects, and `NotFoundError` when no credential has that id
	 * and type. The access check runs before the row is loaded, so an unknown
	 * id is usually refused as forbidden. The one exception is a workflow in the
	 * personal project of a user with global credential access: the check
	 * grants every id, so an unknown id is reported as not found.
	 */
	async resolve({
		credential,
		execution,
		context,
		consumer,
	}: ResolveCredentialRequest): Promise<ICredentialDataDecryptedObject> {
		// Checked on every request. The token proves the caller is the engine,
		// not that this workflow may use this credential. The dispatcher ran the
		// same check when the execution started, but a credential can be unshared
		// from the workflow's project while the execution is still running.
		const { inaccessibleIds } = await this.permissionChecker.findInaccessible(
			execution.workflowId,
			[credential.id],
		);
		if (inaccessibleIds.length > 0) {
			this.logger.warn(
				`Refused credential "${credential.id}" to workflow "${execution.workflowId}" - not shared with its projects`,
			);
			throw new ForbiddenError('Credential is not shared with the workflow');
		}

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			userId: context.userId,
			workflowId: execution.workflowId,
			projectId: context.projectId,
		});
		additionalData.executionId = execution.executionId;

		try {
			return await this.credentialsHelper.getDecrypted(
				additionalData,
				{ id: credential.id, name: credential.name },
				credential.type,
				execution.mode,
				toExecuteData(consumer.nodeType),
			);
		} catch (error) {
			if (error instanceof CredentialNotFoundError) throw new NotFoundError(error.message);
			throw error;
		}
	}
}
