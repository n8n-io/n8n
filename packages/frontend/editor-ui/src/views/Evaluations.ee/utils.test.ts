import { describe, it, expect } from 'vitest';
import { applyCachedSortOrder } from './utils';

describe('utils', () => {
	describe('applyCachedSortOrder', () => {
		it('should reorder columns according to cached order', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const cachedOrder = [
				'metrics.accuracy',
				'inputs.query',
				'metrics.executionTime',
				'outputs.result',
			];

			const result = applyCachedSortOrder(defaultOrder, cachedOrder);

			expect(result).toEqual([
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
			]);
		});

		it('should handle extra keys in both cached order and default order', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'inputs.limit',
					label: 'limit',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				}, // Extra key not in cached order
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'outputs.count',
					label: 'count',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				}, // Extra key not in cached order
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				}, // Extra key not in cached order
			];

			const cachedOrder = [
				'metrics.accuracy',
				'metrics.nonexistent1', // Extra key not in default order
				'inputs.query',
				'metrics.nonexistent2', // Extra key not in default order
				'outputs.result',
				'metrics.nonexistent3', // Extra key not in default order
			];

			const result = applyCachedSortOrder(defaultOrder, cachedOrder);

			expect(result).toEqual([
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{ key: 'metrics.nonexistent1', disabled: true },
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{ key: 'metrics.nonexistent2', disabled: true },
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
				{ key: 'metrics.nonexistent3', disabled: true },
				{
					key: 'inputs.limit',
					label: 'limit',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.count',
					label: 'count',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
			]);
		});

		it('should handle empty cached order and return default order unchanged', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const result = applyCachedSortOrder(defaultOrder, []);

			expect(result).toEqual(defaultOrder);
		});

		it('should handle undefined cached order and return default order unchanged', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const result = applyCachedSortOrder(defaultOrder, undefined);

			expect(result).toEqual(defaultOrder);
		});

		it('should handle cached order with all keys not in default order', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
			];

			const cachedOrder = ['metrics.accuracy', 'metrics.speed', 'outputs.error'];

			const result = applyCachedSortOrder(defaultOrder, cachedOrder);

			expect(result).toEqual([
				{ key: 'metrics.accuracy', disabled: true },
				{ key: 'metrics.speed', disabled: true },
				{ key: 'outputs.error', disabled: true },
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
			]);
		});
	});
});
