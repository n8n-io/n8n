import type { IDataObject, INode, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { SupplyRequest } from 'supply/supply-request';
import type { ITraceable, IDataProvider, IValidatable } from 'types/*';

export class SupplyError implements ITraceable, IDataProvider, IValidatable {
	readonly requestId: string;
	readonly latencyMs: number;
	readonly code: number;
	readonly reason: string;
	readonly isRetriable: boolean;

	constructor(request: SupplyRequest, code: number, reason: string, isRetriable: boolean) {
		this.requestId = request.requestId;
		this.latencyMs = Date.now() - request.requestedAt;
		this.code = code;
		this.reason = reason;
		this.isRetriable = isRetriable;
	}

	throwIfInvalid(): void {
		if (!this.reason || this.reason.length === 0) throw new Error('Error reason must be provided.');
		if (this.code < 100 || this.code > 599) throw new Error('Error code must be a valid HTTP status code.');
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			code: this.code,
			reason: this.reason,
			isRetriable: this.isRetriable,
			latencyMs: this.latencyMs,
		};
	}

	asDataObject(): IDataObject {
		return {
			code: this.code,
			reason: this.reason,
			latencyMs: this.latencyMs,
		};
	}

	asError(node: INode): NodeOperationError {
		return new NodeOperationError(node, this.reason);
	}
}
