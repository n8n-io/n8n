import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../__tests__/credentials';

const responseLabels = [
	{
		LabelModelVersion: '3.0',
		Labels: [
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 99.81004333496094,
				Instances: [],
				Name: 'Alcohol',
				Parents: [
					{
						Name: 'Beverage',
					},
				],
			},
			{
				Aliases: [
					{
						Name: 'Drink',
					},
				],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 99.81004333496094,
				Instances: [],
				Name: 'Beverage',
				Parents: [],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 99.81004333496094,
				Instances: [],
				Name: 'Liquor',
				Parents: [
					{
						Name: 'Alcohol',
					},
					{
						Name: 'Beverage',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 99.75448608398438,
				Instances: [],
				Name: 'Red Wine',
				Parents: [
					{
						Name: 'Alcohol',
					},
					{
						Name: 'Beverage',
					},
					{
						Name: 'Liquor',
					},
					{
						Name: 'Wine',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 99.75448608398438,
				Instances: [],
				Name: 'Wine',
				Parents: [
					{
						Name: 'Alcohol',
					},
					{
						Name: 'Beverage',
					},
					{
						Name: 'Liquor',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Everyday Objects',
					},
				],
				Confidence: 99.52116394042969,
				Instances: [],
				Name: 'Bottle',
				Parents: [],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 94.69605255126953,
				Instances: [],
				Name: 'Wine Bottle',
				Parents: [
					{
						Name: 'Alcohol',
					},
					{
						Name: 'Beverage',
					},
					{
						Name: 'Bottle',
					},
					{
						Name: 'Liquor',
					},
					{
						Name: 'Wine',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 90.0589370727539,
				Instances: [],
				Name: 'Food',
				Parents: [],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 90.0589370727539,
				Instances: [
					{
						BoundingBox: {
							Height: 0.9467026591300964,
							Left: 0.23295101523399353,
							Top: 0.02573961764574051,
							Width: 0.5303559899330139,
						},
						Confidence: 90.0589370727539,
					},
				],
				Name: 'Ketchup',
				Parents: [
					{
						Name: 'Food',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Food and Beverage',
					},
				],
				Confidence: 65.56095123291016,
				Instances: [],
				Name: 'Beer',
				Parents: [
					{
						Name: 'Alcohol',
					},
					{
						Name: 'Beverage',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Text and Documents',
					},
				],
				Confidence: 61.83842468261719,
				Instances: [],
				Name: 'Document',
				Parents: [
					{
						Name: 'Text',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Text and Documents',
					},
				],
				Confidence: 61.83842468261719,
				Instances: [],
				Name: 'Id Cards',
				Parents: [
					{
						Name: 'Document',
					},
					{
						Name: 'Text',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Text and Documents',
					},
				],
				Confidence: 61.83842468261719,
				Instances: [
					{
						BoundingBox: {
							Height: 0.5003108382225037,
							Left: 0.2603513300418854,
							Top: 0.2912488579750061,
							Width: 0.4734913110733032,
						},
						Confidence: 61.83842468261719,
					},
				],
				Name: 'Passport',
				Parents: [
					{
						Name: 'Document',
					},
					{
						Name: 'Id Cards',
					},
					{
						Name: 'Text',
					},
				],
			},
			{
				Aliases: [],
				Categories: [
					{
						Name: 'Text and Documents',
					},
				],
				Confidence: 61.83842468261719,
				Instances: [],
				Name: 'Text',
				Parents: [],
			},
		],
	},
];

describe('Test AWS Rekogntion Node', () => {
	describe('Image Labels Recognition', () => {
		const baseUrl = 'https://rekognition.eu-central-1.amazonaws.com';
		let mock: nock.Scope;

		beforeAll(async () => {
			mock = nock(baseUrl);
		});

		beforeEach(async () => {
			mock.post('/').reply(200, responseLabels);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
