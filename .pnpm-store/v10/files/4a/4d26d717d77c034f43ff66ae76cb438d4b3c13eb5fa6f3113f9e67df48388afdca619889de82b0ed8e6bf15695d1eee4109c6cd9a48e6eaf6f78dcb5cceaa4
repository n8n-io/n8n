import Connection from '../connection/index.js';
import { Reference } from '../openapi/types.js';
import { BeaconPath } from '../utils/beaconPath.js';
import { CommandBase } from '../validation/commandBase.js';
import { ReferencesPath } from './path.js';
import { ConsistencyLevel } from './replication.js';
export default class ReferenceDeleter extends CommandBase {
    private beaconPath;
    private className;
    private consistencyLevel?;
    private id;
    private reference;
    private referencesPath;
    private refProp;
    private tenant?;
    constructor(client: Connection, referencesPath: ReferencesPath, beaconPath: BeaconPath);
    withId: (id: string) => this;
    withClassName(className: string): this;
    withReference: (ref: Reference) => this;
    withReferenceProperty: (refProp: string) => this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    withTenant: (tenant: string) => this;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validate: () => void;
    payload: () => {
        class?: string | undefined;
        schema?: {
            [key: string]: unknown;
        } | undefined;
        beacon?: string | undefined;
        href?: string | undefined;
        classification?: {
            overallCount?: number | undefined;
            winningCount?: number | undefined;
            losingCount?: number | undefined;
            closestOverallDistance?: number | undefined;
            winningDistance?: number | undefined;
            meanWinningDistance?: number | undefined;
            closestWinningDistance?: number | undefined;
            closestLosingDistance?: number | undefined;
            losingDistance?: number | undefined;
            meanLosingDistance?: number | undefined;
        } | undefined;
    };
    do: () => Promise<any>;
}
