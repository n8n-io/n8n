import { MappingService } from '../service/mapping.service';
import { GlobalService } from '../service/global.service';
import { ScenarioService } from '../service/scenario.service';
import { RequestService } from '../service/request.service';
import { RecordingService } from '../service/recording.service';
import { Options } from '../model/options.model';
export declare class WireMockRestClient {
    baseUri: string;
    constructor(baseUri: string, options?: Options);
    get mappings(): MappingService;
    get requests(): RequestService;
    get recordings(): RecordingService;
    get scenarios(): ScenarioService;
    get global(): GlobalService;
}
