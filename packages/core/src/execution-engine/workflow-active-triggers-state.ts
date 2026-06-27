import type { ITriggerResponse } from 'n8n-workflow';

export type TriggerRegistrationToken = symbol;

type TriggerRegistration = {
	token: TriggerRegistrationToken;
	response?: ITriggerResponse;
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

	/** Records a trigger response for a registered node. */
	addTriggerResponse(nodeId: string, response: ITriggerResponse): TriggerRegistrationToken {
		const registration = this.getOrCreateRegistration(nodeId);
		registration.response = response;

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

	/** All recorded trigger responses, in insertion order. */
	*triggerResponses(): IterableIterator<ITriggerResponse> {
		for (const registration of this.registrationsByNodeId.values()) {
			if (registration.response) yield registration.response;
		}
	}
}
