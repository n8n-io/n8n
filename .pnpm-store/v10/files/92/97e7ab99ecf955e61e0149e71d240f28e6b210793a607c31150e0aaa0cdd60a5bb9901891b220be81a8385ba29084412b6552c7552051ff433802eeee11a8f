import { DsnComponents } from '../types-hoist/dsn';
import { LogContainerItem, LogEnvelope } from '../types-hoist/envelope';
import { SerializedLog } from '../types-hoist/log';
import { SdkMetadata } from '../types-hoist/sdkmetadata';
/**
 * Creates a log container envelope item for a list of logs.
 *
 * @param items - The logs to include in the envelope.
 * @returns The created log container envelope item.
 */
export declare function createLogContainerEnvelopeItem(items: Array<SerializedLog>): LogContainerItem;
/**
 * Creates an envelope for a list of logs.
 *
 * Logs from multiple traces can be included in the same envelope.
 *
 * @param logs - The logs to include in the envelope.
 * @param metadata - The metadata to include in the envelope.
 * @param tunnel - The tunnel to include in the envelope.
 * @param dsn - The DSN to include in the envelope.
 * @returns The created envelope.
 */
export declare function createLogEnvelope(logs: Array<SerializedLog>, metadata?: SdkMetadata, tunnel?: string, dsn?: DsnComponents): LogEnvelope;
//# sourceMappingURL=envelope.d.ts.map
