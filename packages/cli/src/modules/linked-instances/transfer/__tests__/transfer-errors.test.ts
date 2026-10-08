import {
	BadRequestError,
	ForbiddenError,
	InternalServerError,
	NotFoundError,
	UnexpectedError,
	UserError,
} from '@n8n/errors';
import fc from 'fast-check';

import {
	REMOTE_INSTANCE_ERROR_REASONS,
	RemoteInstanceError,
} from '../../remote/remote-instance.errors';
import { RESPONSE_OVER_LIMIT_MESSAGE } from '../../remote/remote-instance.transports';
import {
	classifyRemoteRefusal,
	describePlace,
	isProjectRefusal,
	missingToolMessage,
	RemoteImportError,
	remoteFailureMessage,
	toTransferHttpError,
	TRANSFER_MESSAGES,
	TRANSFER_WARNINGS,
	transferContext,
	transferFailureReason,
	type TransferErrorContext,
} from '../transfer-errors';

const OPS = { id: 'Xk3pQ9aZ1bC2dE4f', name: 'Ops' };
const PUSH: TransferErrorContext = { direction: 'push', name: 'Cloud', place: 'Ops on Cloud' };
const PULL: TransferErrorContext = { direction: 'pull', name: 'Cloud', place: 'Ops on Cloud' };

// The texts of the n8n tools, as the remote import and export return them.
const REMOTE_TEXTS = {
	projectRefused:
		'The project does not exist, or you do not have permission to create workflows in it.',
	notInMcp:
		'The package matches the workflow "Daily report" (wf1) in the target project, so the import would update that workflow. Workflow is not available in MCP. Enable MCP access from the workflow card in the workflows list, or from the workflow settings: https://cloud.test/workflow/wf1?settings=true You can also import the package into another project.',
	archived:
		'The package matches the workflow "Daily report" (wf1) in the target project, so the import would update that workflow. Workflow \'wf1\' is archived and cannot be accessed. You can also import the package into another project.',
	exportNotInMcp:
		'Workflow is not available in MCP. Enable MCP access from the workflow card in the workflows list.',
	exportArchived: "Workflow 'wf1' is archived and cannot be accessed.",
	sizeLimit:
		'The workflow package is larger than the limit of 1 MB. An admin can change the limit with N8N_PAYLOAD_SIZE_MAX.',
};

const toolError = (text: string) => new RemoteInstanceError('tool-error', text);

describe('classifyRemoteRefusal', () => {
	it.each([
		[REMOTE_TEXTS.projectRefused, 'project-refused'],
		[REMOTE_TEXTS.notInMcp, 'not-in-mcp'],
		[REMOTE_TEXTS.archived, 'archived'],
		[REMOTE_TEXTS.exportNotInMcp, 'not-in-mcp'],
		[REMOTE_TEXTS.exportArchived, 'archived'],
		[REMOTE_TEXTS.sizeLimit, undefined],
		[
			'The package holds an archived workflow. Restore the workflow, then export it again.',
			undefined,
		],
		['', undefined],
	])('classifies %j as %s', (text, refusal) => {
		expect(classifyRemoteRefusal(text)).toBe(refusal);
	});
});

describe('isProjectRefusal', () => {
	it('is true only for a tool error with the project refusal text', () => {
		expect(isProjectRefusal(toolError(REMOTE_TEXTS.projectRefused))).toBe(true);
		expect(isProjectRefusal(toolError(REMOTE_TEXTS.notInMcp))).toBe(false);
		expect(
			isProjectRefusal(new RemoteInstanceError('unreachable', REMOTE_TEXTS.projectRefused)),
		).toBe(false);
		expect(isProjectRefusal(new ForbiddenError(REMOTE_TEXTS.projectRefused))).toBe(false);
	});
});

describe('describePlace and transferContext', () => {
	it('names the project on the instance, also the personal project', () => {
		expect(describePlace('Cloud', OPS)).toBe('Ops on Cloud');
		expect(describePlace('Cloud', null)).toBe('your personal project on Cloud');
	});

	it('builds the context of a link', () => {
		expect(transferContext({ name: 'Cloud', defaultRemoteProject: OPS }, 'push')).toEqual(PUSH);
		expect(transferContext({ name: 'Cloud', defaultRemoteProject: null }, 'pull')).toEqual({
			direction: 'pull',
			name: 'Cloud',
			place: 'your personal project on Cloud',
		});
	});
});

describe('remoteFailureMessage', () => {
	it('uses the en-GB messages of the spec for an unreachable and an unauthorised instance', () => {
		expect(remoteFailureMessage(new RemoteInstanceError('unreachable'), PUSH)).toBe(
			"Can't reach Cloud. Check that it's running, then try again.",
		);
		expect(remoteFailureMessage(new RemoteInstanceError('unauthorised'), PULL)).toBe(
			'Cloud refused the access token. Change the token in Settings > Linked instances.',
		);
	});

	it('has a message for every remote reason in both directions', () => {
		for (const reason of REMOTE_INSTANCE_ERROR_REASONS) {
			for (const context of [PUSH, PULL]) {
				const message = remoteFailureMessage(new RemoteInstanceError(reason), context);
				expect(message).toContain('Cloud');
				expect(message.length).toBeGreaterThan(20);
			}
		}
	});

	it('tells the user to turn on MCP access', () => {
		expect(remoteFailureMessage(new RemoteInstanceError('mcp-disabled'), PUSH)).toBe(
			TRANSFER_MESSAGES.mcpDisabled('Cloud'),
		);
	});

	it('tells that a timed out push can still arrive, and a timed out pull only to try again', () => {
		expect(remoteFailureMessage(new RemoteInstanceError('timeout'), PUSH)).toBe(
			TRANSFER_MESSAGES.pushTimeout('Cloud'),
		);
		expect(remoteFailureMessage(new RemoteInstanceError('timeout'), PULL)).toBe(
			TRANSFER_MESSAGES.timeout('Cloud'),
		);
	});

	it('tells that a pulled workflow is too large only for the response size error of a pull', () => {
		const tooLarge = new RemoteInstanceError('unreachable', RESPONSE_OVER_LIMIT_MESSAGE);

		expect(remoteFailureMessage(tooLarge, PULL)).toBe(TRANSFER_MESSAGES.pullTooLarge('Cloud'));
		expect(remoteFailureMessage(tooLarge, PUSH)).toBe(TRANSFER_MESSAGES.unreachable('Cloud'));
		expect(remoteFailureMessage(new RemoteInstanceError('unreachable'), PULL)).toBe(
			TRANSFER_MESSAGES.unreachable('Cloud'),
		);
	});

	it('asks for MCP access on the copy in the target place for a push, and on the instance for a pull', () => {
		expect(remoteFailureMessage(toolError(REMOTE_TEXTS.notInMcp), PUSH)).toBe(
			'Turn on MCP access for this workflow in Ops on Cloud, then try again.',
		);
		expect(remoteFailureMessage(toolError(REMOTE_TEXTS.exportNotInMcp), PULL)).toBe(
			'Turn on MCP access for this workflow in Cloud, then try again.',
		);
	});

	it('asks to restore an archived copy', () => {
		expect(remoteFailureMessage(toolError(REMOTE_TEXTS.archived), PUSH)).toBe(
			'This workflow is archived in Ops on Cloud. Restore it there, then try again.',
		);
		expect(remoteFailureMessage(toolError(REMOTE_TEXTS.exportArchived), PULL)).toBe(
			'This workflow is archived in Cloud. Restore it there, then try again.',
		);
	});

	it('shows any other remote text as is, for example the size limit of the instance', () => {
		expect(remoteFailureMessage(toolError(REMOTE_TEXTS.sizeLimit), PUSH)).toBe(
			`Cloud could not take the workflow: ${REMOTE_TEXTS.sizeLimit}`,
		);
		expect(remoteFailureMessage(toolError(REMOTE_TEXTS.sizeLimit), PULL)).toBe(
			`Cloud could not send the workflow: ${REMOTE_TEXTS.sizeLimit}`,
		);
	});
});

describe('RemoteImportError', () => {
	it('keeps the reason and the text of the remote failure', () => {
		const error = new RemoteImportError(toolError(REMOTE_TEXTS.projectRefused), OPS);

		expect(error).toBeInstanceOf(RemoteInstanceError);
		expect(error).toMatchObject({
			reason: 'tool-error',
			message: REMOTE_TEXTS.projectRefused,
			project: OPS,
		});
		expect(isProjectRefusal(error)).toBe(true);
		expect(
			transferFailureReason(new RemoteImportError(new RemoteInstanceError('timeout'), null)),
		).toBe('timeout');
	});

	it('names the project of the failed import in the message of a push, not the default project', () => {
		const inPersonal = (text: string) => new RemoteImportError(toolError(text), null);
		const inSales = (text: string) =>
			new RemoteImportError(toolError(text), { id: 'Sa1eS2pR3oJ4eC5t', name: 'Sales' });

		expect(remoteFailureMessage(inPersonal(REMOTE_TEXTS.notInMcp), PUSH)).toBe(
			'Turn on MCP access for this workflow in your personal project on Cloud, then try again.',
		);
		expect(remoteFailureMessage(inSales(REMOTE_TEXTS.archived), PUSH)).toBe(
			'This workflow is archived in Sales on Cloud. Restore it there, then try again.',
		);
		expect(remoteFailureMessage(inPersonal(REMOTE_TEXTS.sizeLimit), PUSH)).toBe(
			`Cloud could not take the workflow: ${REMOTE_TEXTS.sizeLimit}`,
		);
	});
});

describe('toTransferHttpError', () => {
	it('turns a remote failure into a 400 with the en-GB message', () => {
		const error = toTransferHttpError(new RemoteInstanceError('unreachable'), PUSH);

		expect(error).toBeInstanceOf(BadRequestError);
		expect(error).toHaveProperty('message', TRANSFER_MESSAGES.unreachable('Cloud'));
	});

	it('keeps every other error as it is', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(
					new NotFoundError('x'),
					new ForbiddenError('x'),
					new BadRequestError('x'),
					new UserError('x'),
					new Error('x'),
				),
				(error) => {
					expect(toTransferHttpError(error, PUSH)).toBe(error);
				},
			),
		);
	});
});

describe('transferFailureReason', () => {
	it('keeps the reason of a remote failure', () => {
		for (const reason of REMOTE_INSTANCE_ERROR_REASONS) {
			expect(transferFailureReason(new RemoteInstanceError(reason))).toBe(reason);
		}
	});

	it.each([
		['a forbidden request', new ForbiddenError('x'), 'refused'],
		['a missing entity', new NotFoundError('x'), 'refused'],
		['a bad request', new BadRequestError('x'), 'refused'],
		['a user error', new UserError('x'), 'refused'],
		['a server error', new InternalServerError('x'), 'internal'],
		['an unexpected error', new UnexpectedError('x'), 'internal'],
		['a plain error', new Error('x'), 'internal'],
		['a thrown string', 'x', 'internal'],
	])('gives %s the reason %s', (_, error, reason) => {
		expect(transferFailureReason(error)).toBe(reason);
	});
});

describe('missingToolMessage', () => {
	const tools = (...names: string[]) => new Set(names);

	it('accepts a push when the instance offers the import', () => {
		expect(missingToolMessage(tools('import_workflow_package'), 'push', 'Cloud')).toBeUndefined();
	});

	it('asks for the MCP workflow builder when the instance offers the export but not the import', () => {
		expect(missingToolMessage(tools('export_workflow_package'), 'push', 'Cloud')).toBe(
			'Cloud cannot receive workflows while its MCP workflow builder is off. Ask an admin of Cloud to set N8N_MCP_BUILDER_ENABLED to true.',
		);
	});

	it('says that the instance cannot receive workflows yet when it offers neither tool', () => {
		expect(missingToolMessage(tools('search_workflows'), 'push', 'Cloud')).toBe(
			TRANSFER_MESSAGES.cannotReceive('Cloud'),
		);
	});

	it('needs the export for a pull, and nothing else', () => {
		expect(missingToolMessage(tools('export_workflow_package'), 'pull', 'Cloud')).toBeUndefined();
		expect(missingToolMessage(tools('import_workflow_package'), 'pull', 'Cloud')).toBe(
			TRANSFER_MESSAGES.cannotSend('Cloud'),
		);
	});
});

describe('TRANSFER_WARNINGS', () => {
	it('adds exactly one full stop after a reason, with or without its own', () => {
		expect(TRANSFER_WARNINGS.publishFailed('Cloud', 'The workflow has no trigger.')).toBe(
			'The workflow is in Cloud, but Cloud could not publish it: The workflow has no trigger. Publish it in Cloud.',
		);
		expect(TRANSFER_WARNINGS.turnOffFailed('someone else is editing it')).toBe(
			'The workflow is still turned on here: someone else is editing it. Turn it off in the editor.',
		);
	});

	it('says how many credentials need a value before the copy can go live', () => {
		expect(TRANSFER_WARNINGS.credentialsNeedSetup('Cloud', 2)).toBe(
			'The workflow is in Cloud, but 2 credential(s) there have no value, so it is not published. Set them up, then publish it in Cloud.',
		);
	});
});
