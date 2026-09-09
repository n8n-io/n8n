import { Service } from '@n8n/di';

/**
 * Holds the instance-wide read-only flag so consumers don't have to depend on
 * source-control internals. The source-control module is the only writer: it
 * mirrors its `branchReadOnly` preference here whenever preferences change.
 * When source control is inactive the flag stays false (instance is writable).
 */
@Service()
export class InstanceWriteAccessService {
	private readOnly = false;

	setReadOnly(value: boolean) {
		this.readOnly = value;
	}

	isReadOnly() {
		return this.readOnly;
	}
}
