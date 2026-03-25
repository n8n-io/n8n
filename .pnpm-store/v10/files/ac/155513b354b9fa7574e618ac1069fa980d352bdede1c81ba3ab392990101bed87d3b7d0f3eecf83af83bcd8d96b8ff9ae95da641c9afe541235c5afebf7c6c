import { RecordSpec } from '../model/record-spec.model';
import { StubMappings } from '../model/stub-mappings.model';
export declare class RecordingService {
    baseUri: string;
    constructor(baseUri: string);
    /**
     * Start recording stub mappings
     * @param recordSpec Record specification
     */
    startRecording(recordSpec: RecordSpec): Promise<void>;
    /**
     * Stop recording stub mappings
     * @param recordSpec Record specification
     */
    stopRecording(): Promise<StubMappings>;
    /**
     * Get recording status
     */
    getRecordingStatus(): Promise<any>;
    /**
     * Take a snapshot recording
     * @param recordSpec Record specification
     */
    takeSnapshotRecording(snapshotSpec: RecordSpec): Promise<StubMappings>;
}
