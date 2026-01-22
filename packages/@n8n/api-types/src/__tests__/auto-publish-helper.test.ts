import type { AutoPublishMode } from 'dto';

import { shouldActivateWorkflow } from '../auto-publish-helper';

describe('shouldActivateWorkflow', () => {
	describe('with autoPublish: "none"', () => {
		test.each([
			{
				name: 'new workflow',
				params: {
					isNewWorkflow: true,
					wasPublished: false,
					isNowArchived: false,
					autoPublish: 'none' as AutoPublishMode,
				},
				expected: false,
			},
			{
				name: 'existing published workflow',
				params: {
					isNewWorkflow: false,
					wasPublished: true,
					isNowArchived: false,
					autoPublish: 'none' as AutoPublishMode,
				},
				expected: false,
			},
			{
				name: 'existing unpublished workflow',
				params: {
					isNewWorkflow: false,
					wasPublished: false,
					isNowArchived: false,
					autoPublish: 'none' as AutoPublishMode,
				},
				expected: false,
			},
		])('should return false for $name', ({ params, expected }) => {
			expect(shouldActivateWorkflow(params)).toBe(expected);
		});
	});

	describe('with autoPublish: "published"', () => {
		test.each([
			{
				name: 'new workflow',
				params: {
					isNewWorkflow: true,
					wasPublished: false,
					isNowArchived: false,
					autoPublish: 'published' as AutoPublishMode,
				},
				expected: false,
			},
			{
				name: 'existing published workflow',
				params: {
					isNewWorkflow: false,
					wasPublished: true,
					isNowArchived: false,
					autoPublish: 'published' as AutoPublishMode,
				},
				expected: true,
			},
			{
				name: 'existing unpublished workflow',
				params: {
					isNewWorkflow: false,
					wasPublished: false,
					isNowArchived: false,
					autoPublish: 'published' as AutoPublishMode,
				},
				expected: false,
			},
		])('should return $expected for $name', ({ params, expected }) => {
			expect(shouldActivateWorkflow(params)).toBe(expected);
		});
	});

	describe('with autoPublish: "all"', () => {
		test.each([
			{
				name: 'new workflow',
				params: {
					isNewWorkflow: true,
					wasPublished: false,
					isNowArchived: false,
					autoPublish: 'all' as AutoPublishMode,
				},
				expected: true,
			},
			{
				name: 'existing published workflow',
				params: {
					isNewWorkflow: false,
					wasPublished: true,
					isNowArchived: false,
					autoPublish: 'all' as AutoPublishMode,
				},
				expected: true,
			},
			{
				name: 'existing unpublished workflow',
				params: {
					isNewWorkflow: false,
					wasPublished: false,
					isNowArchived: false,
					autoPublish: 'all' as AutoPublishMode,
				},
				expected: true,
			},
		])('should return $expected for $name', ({ params, expected }) => {
			expect(shouldActivateWorkflow(params)).toBe(expected);
		});
	});

	describe('archived workflows', () => {
		test('should never activate archived workflows regardless of settings', () => {
			const autoPublishModes = [
				{ autoPublish: 'none' as AutoPublishMode },
				{ autoPublish: 'published' as AutoPublishMode },
				{ autoPublish: 'all' as AutoPublishMode },
			];

			const workflowStates = [
				{ isNewWorkflow: true, wasPublished: false },
				{ isNewWorkflow: false, wasPublished: true },
				{ isNewWorkflow: false, wasPublished: false },
			];

			autoPublishModes.forEach(({ autoPublish }) => {
				workflowStates.forEach(({ isNewWorkflow, wasPublished }) => {
					expect(
						shouldActivateWorkflow({
							isNewWorkflow,
							wasPublished,
							isNowArchived: true,
							autoPublish,
						}),
					).toBe(false);
				});
			});
		});
	});
});
