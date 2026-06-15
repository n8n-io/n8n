import { UpdateOtelSettingsDto } from './update-otel-settings.dto';
import { Z } from '../../zod-class';

export class TestOtelConnectionDto extends Z.class(
	UpdateOtelSettingsDto.schema.pick({
		exporterEndpoint: true,
		exporterTracingPath: true,
		exporterServiceName: true,
		exporterHeaders: true,
		startupConnectivityTimeoutMs: true,
	}).shape,
) {}
