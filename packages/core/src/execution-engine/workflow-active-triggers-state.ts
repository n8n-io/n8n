import type { ITriggerResponse, WorkflowExpression } from 'n8n-workflow';

export type TriggerRegistrationToken = symbol;

type TriggerRegistration = {
	token: TriggerRegistrationToken;
	response?: ITriggerResponse;
	/** The registering workflow's expression handle, needed to hold an isolate while closing the trigger. */
	expression?: WorkflowExpression;
};

/**
 * Holds the in-memory trigger registrations for a single workflow, keyed by node id.
 * Poll nodes are registered here even though they do not have a trigger response.
 */
export class WorkflowActiveTriggersState {
	private readonly registrationsByNodeId = new Map<string, TriggerRegistration>();

	private pendingRegistrations = 0;

	/** Marks an in-flight registration using this state object. */
	beginRegistration() {
		this.pendingRegistrations += 1;
	}

	/** Marks an in-flight registration as finished. */
	finishRegistration() {
		this.pendingRegistrations -= 1;
	}

	/** Whether this state object is still being populated by an activation. */
	get hasPendingRegistrations() {
		return this.pendingRegistrations > 0;
	}

	/** Records a trigger response for a registered node, along with the workflow's expression handle used to close it under an isolate. */
	addTriggerResponse(
		nodeId: string,
		response: ITriggerResponse,
		expression: WorkflowExpression,
	): TriggerRegistrationToken {
		const registration = this.getOrCreateRegistration(nodeId);
		registration.response = response;
		registration.expression = expression;

		return registration.token;
	}

	/** Records a schedule trigger that registered cron state but has no response. */
	addScheduledTrigger(nodeId: string): TriggerRegistrationToken {
		return this.getOrCreateRegistration(nodeId).token;
	}

	/** Records a poller for a registered node. */
	addPoller(nodeId: string): TriggerRegistrationToken {
		return this.getOrCreateRegistration(nodeId).token;
	}

	private getOrCreateRegistration(nodeId: string): TriggerRegistration {
		const existing = this.registrationsByNodeId.get(nodeId);
		if (existing) return existing;

		const registration: TriggerRegistration = { token: Symbol(nodeId) };
		this.registrationsByNodeId.set(nodeId, registration);

		return registration;
	}

	/** The trigger response recorded for a node, if any. */
	get(nodeId: string) {
		return this.registrationsByNodeId.get(nodeId)?.response;
	}

	/** The expression handle recorded for a node's trigger response, if any. */
	getExpression(nodeId: string) {
		return this.registrationsByNodeId.get(nodeId)?.expression;
	}

	/** Whether the given node is registered in memory. */
	has(nodeId: string) {
		return this.registrationsByNodeId.has(nodeId);
	}

	/** Whether a node registration is still the current generation. */
	isCurrent(nodeId: string, token: TriggerRegistrationToken) {
		return this.registrationsByNodeId.get(nodeId)?.token === token;
	}

	/** Drops the registration recorded for a node. */
	delete(nodeId: string) {
		this.registrationsByNodeId.delete(nodeId);
	}

	/** Whether no trigger registrations have been recorded yet. */
	get isEmpty() {
		return this.registrationsByNodeId.size === 0;
	}

	/** Ids of the nodes registered in memory. */
	get nodeIds(): IterableIterator<string> {
		return this.registrationsByNodeId.keys();
	}

	/**
	 * Registrations that hold a trigger response to close, with their node ids,
	 * in insertion order. Response-less registrations (schedule and poll
	 * markers) are excluded — they have nothing to close.
	 */
	*closableTriggers() {
		for (const [nodeId, registration] of this.registrationsByNodeId.entries()) {
			if (registration.response) {
				yield { nodeId, response: registration.response, expression: registration.expression };
			}
		}
	}
}
