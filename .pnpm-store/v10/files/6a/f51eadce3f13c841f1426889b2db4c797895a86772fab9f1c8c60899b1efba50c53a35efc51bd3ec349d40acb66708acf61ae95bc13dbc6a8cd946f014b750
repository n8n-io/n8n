import { AttributeLimits, Propagator, ConfigurationModel } from './models/configModel';
import { ConfigFactory } from './IConfigFactory';
import { SeverityNumber } from './models/commonModel';
import { TracerProvider } from './models/tracerProviderModel';
import { LoggerProvider } from './models/loggerProviderModel';
import { AttributeNameValue } from './models/resourceModel';
import { ExporterTemporalityPreference, MeterProvider } from './models/meterProviderModel';
export declare class FileConfigFactory implements ConfigFactory {
    private _config;
    constructor();
    getConfigModel(): ConfigurationModel;
}
export declare function hasValidConfigFile(): boolean;
export declare function parseConfigFile(config: ConfigurationModel): void;
export declare function setResourceAttributes(config: ConfigurationModel, attributes: AttributeNameValue[], attributeList: string): void;
export declare function setAttributeLimits(config: ConfigurationModel, attrLimits: AttributeLimits): void;
export declare function setPropagator(config: ConfigurationModel, propagator: Propagator): void;
export declare function setTracerProvider(config: ConfigurationModel, tracerProvider: TracerProvider): void;
export declare function getTemporalityPreference(temporalityPreference?: ExporterTemporalityPreference): ExporterTemporalityPreference;
export declare function setMeterProvider(config: ConfigurationModel, meterProvider: MeterProvider): void;
export declare function getSeverity(severity?: SeverityNumber): SeverityNumber | undefined;
export declare function setLoggerProvider(config: ConfigurationModel, loggerProvider: LoggerProvider): void;
//# sourceMappingURL=FileConfigFactory.d.ts.map