import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExecutionLevelTracer } from '../execution-level-tracer';
import { OtelModule } from '../otel.module';
import { OtelSettingsService } from '../otel-settings.service';

type ExtractInboundBaggage = (header: unknown) => string | undefined;

describe('OtelModule', () => {
	describe('extractInboundBaggage', () => {
		const extractorWith = async (enabled: boolean, injectOutbound: boolean) => {
			const settingsService = mock<OtelSettingsService>();
			settingsService.getSettings.mockReturnValue({ enabled, injectOutbound } as never);

			Container.set(OtelSettingsService, settingsService);
			Container.set(ExecutionLevelTracer, mock<ExecutionLevelTracer>());
			Container.set(Logger, mock<Logger>());

			const context = await new OtelModule().context();
			return context.extractInboundBaggage as ExtractInboundBaggage;
		};

		afterEach(() => Container.reset());

		it('reads the header when OTel and the outbound headers are on', async () => {
			const extractInboundBaggage = await extractorWith(true, true);

			expect(extractInboundBaggage('tenant=acme')).toBe('tenant=acme');
		});

		it.each([
			['OTel is off', false, true],
			['the outbound headers are off', true, false],
			['both are off', false, false],
		])('reads no header when %s', async (_name, enabled, injectOutbound) => {
			const extractInboundBaggage = await extractorWith(enabled, injectOutbound);

			expect(extractInboundBaggage('tenant=acme')).toBeUndefined();
		});
	});
});
