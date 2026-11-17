import { UnexpectedError } from '@n8n/errors';
import { ICredentialsHelper } from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import { failExecution, type ExecutionSetup } from '../execution-context';

export class TestCredentialsHelper extends ICredentialsHelper {
	constructor(private readonly context: ExecutionSetup) {
		super();
	}

	getParentTypes(type: string): never {
		return this.refuse(type);
	}

	isCredentialUsableByNode(): boolean {
		return true;
	}

	getCredentialsProperties(type: string): never {
		return this.refuse(type);
	}

	async getDecrypted(_additionalData: unknown, _nodeCredentials: unknown, type: string) {
		return this.refuse(type);
	}

	async getCredentials(): Promise<never> {
		throw new UnexpectedError('The test library holds no stored credentials');
	}

	async authenticate(_credentials: unknown, typeName: string) {
		return this.refuse(typeName);
	}

	async preAuthentication(_helpers: unknown, _credentials: unknown, typeName: string) {
		return this.refuse(typeName);
	}

	async runPreAuthentication(_helpers: unknown, _credentials: unknown, typeName: string) {
		return this.refuse(typeName);
	}

	async updateCredentials(): Promise<void> {}

	async updateCredentialsOauthTokenData(): Promise<void> {}

	private refuse(type: string): never {
		const node = this.context.runs.open.at(-1)?.node;
		return failExecution(
			this.context,
			new WorkflowTestError(
				'CREDENTIAL_NOT_SUPPLIED',
				`Node "${node}" needs a "${type}" credential, which a test cannot supply. Mock the node with mockNode().`,
				{ workflow: this.context.handle.name, node },
			),
		);
	}
}
