import type { Logger } from '@n8n/backend-common';
import { ExportResultCode } from '@opentelemetry/core';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { mock } from 'jest-mock-extended';

import { SafeTraceExporter } from '../safe-trace-exporter';

describe('SafeTraceExporter', () => {
	it('should log export failures only once', () => {
		const wrappedExporter = mock<SpanExporter>({
			export: jest.fn((_spans, callback) => callback({ code: ExportResultCode.FAILED })),
		});
		const logger = mock<Logger>();
		const exporter = new SafeTraceExporter(wrappedExporter, logger);

		exporter.export([], () => {});
		exporter.export([], () => {});

		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to export OpenTelemetry spans to OTLP endpoint',
			expect.any(Object),
		);
	});

	it('should convert thrown export errors into failed export results', () => {
		const wrappedExporter = mock<SpanExporter>({
			export: jest.fn(() => {
				throw new Error('export failure');
			}),
		});
		const logger = mock<Logger>();
		const exporter = new SafeTraceExporter(wrappedExporter, logger);
		const resultCallback = jest.fn();

		exporter.export([], resultCallback);

		expect(resultCallback).toHaveBeenCalledWith(
			expect.objectContaining({ code: ExportResultCode.FAILED }),
		);
		expect(logger.error).toHaveBeenCalledTimes(1);
	});
});
