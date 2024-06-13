import { WorkflowEntity } from '@db/entities/WorkflowEntity';
export declare const FIRST_CREDENTIAL_ID = "1";
export declare const SECOND_CREDENTIAL_ID = "2";
export declare const THIRD_CREDENTIAL_ID = "3";
export declare function getWorkflow(options?: {
    addNodeWithoutCreds?: boolean;
    addNodeWithOneCred?: boolean;
    addNodeWithTwoCreds?: boolean;
}): WorkflowEntity;
