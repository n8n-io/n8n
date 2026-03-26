import type { Logger } from '@n8n/backend-common';
import { ExportResultCode } from '@opentelemetry/core';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { mock } from 'jest-mock-extended';

import { SafeTraceExporter } from '../safe-trace-exporter';

describe('SafeTraceExporter', () => {
	it('should forward successful exports without logging', () => {
		const wrappedExporter = mock<SpanExporter>({
			export: jest.fn((_spans, callback) => callback({ code: ExportResultCode.SUCCESS })),
		});
		const logger = mock<Logger>();
		const exporter = new SafeTraceExporter(wrappedExporter, logger);
		const resultCallback = jest.fn();

		exporter.export([], resultCallback);

		expect(resultCallback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
		expect(logger.error).not.toHaveBeenCalled();
	});

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

	it('should log a shutdown-specific message on shutdown failure', async () => {
		const wrappedExporter = mock<SpanExporter>({
			shutdown: jest.fn().mockRejectedValue(new Error('shutdown failure')),
		});
		const logger = mock<Logger>();
		const exporter = new SafeTraceExporter(wrappedExporter, logger);

		await exporter.shutdown();

		expect(logger.error).toHaveBeenCalledWith(
			'Failed to shut down OpenTelemetry trace exporter',
			expect.any(Object),
		);
	});

	it('should log each failure type once', async () => {
		const wrappedExporter = mock<SpanExporter>({
			export: jest.fn((_spans, callback) => callback({ code: ExportResultCode.FAILED })),
			shutdown: jest.fn().mockRejectedValue(new Error('shutdown failure')),
		});
		const logger = mock<Logger>();
		const exporter = new SafeTraceExporter(wrappedExporter, logger);

		exporter.export([], () => {});
		exporter.export([], () => {});
		await exporter.shutdown();
		await exporter.shutdown();

		expect(logger.error).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenNthCalledWith(
			1,
			'Failed to export OpenTelemetry spans to OTLP endpoint',
			expect.any(Object),
		);
		expect(logger.error).toHaveBeenNthCalledWith(
			2,
			'Failed to shut down OpenTelemetry trace exporter',
			expect.any(Object),
		);
	});
});
