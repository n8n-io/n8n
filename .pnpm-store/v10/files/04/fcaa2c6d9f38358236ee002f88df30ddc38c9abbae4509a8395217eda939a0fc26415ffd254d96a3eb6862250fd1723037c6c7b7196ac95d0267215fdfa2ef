import Connection from '../connection/index.js';
import { WhereFilter } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { HybridArgs } from './hybrid.js';
import { NearAudioArgs, NearDepthArgs, NearIMUArgs, NearMediaBase, NearVideoArgs } from './nearMedia.js';
import { NearObjectArgs } from './nearObject.js';
import { NearTextArgs } from './nearText.js';
import { NearVectorArgs } from './nearVector.js';
interface NearImageArgs extends NearMediaBase {
    image: string;
}
export default class Aggregator extends CommandBase {
    private className?;
    private fields?;
    private groupBy?;
    private hybridString?;
    private includesNearMediaFilter;
    private limit?;
    private nearMediaString?;
    private nearMediaType?;
    private nearObjectString?;
    private nearTextString?;
    private nearVectorString?;
    private objectLimit?;
    private whereString?;
    private tenant?;
    constructor(client: Connection);
    withFields: (fields: string) => this;
    withClassName: (className: string) => this;
    withWhere: (where: WhereFilter) => this;
    private withNearMedia;
    withNearImage: (args: NearImageArgs) => this;
    withNearAudio: (args: NearAudioArgs) => this;
    withNearVideo: (args: NearVideoArgs) => this;
    withNearDepth: (args: NearDepthArgs) => this;
    withNearIMU: (args: NearIMUArgs) => this;
    withNearText: (args: NearTextArgs) => this;
    withNearObject: (args: NearObjectArgs) => this;
    withNearVector: (args: NearVectorArgs) => this;
    withHybrid: (args: HybridArgs) => this;
    withObjectLimit: (objectLimit: number) => this;
    withLimit: (limit: number) => this;
    withGroupBy: (groupBy: string[]) => this;
    withTenant: (tenant: string) => this;
    validateGroup: () => void;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validate: () => void;
    do: () => Promise<{
        data: any;
    }>;
}
export {};
