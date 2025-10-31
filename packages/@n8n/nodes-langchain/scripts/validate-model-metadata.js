const glob = require('fast-glob');
const fs = require('fs');
const path = require('path');

// Required fields for model metadata
const requiredFields = [
	'id',
	'name',
	'provider',
	'pricing',
	'pricing.promptPerMilTokenUsd',
	'pricing.completionPerMilTokenUsd',
	'contextLength',
	'capabilities',
	'intelligenceLevel',
];

const validIntelligenceLevels = ['low', 'medium', 'high'];

// Standardized recommendedFor values
const validRecommendedFor = [
	'coding',
	'analysis',
	'creative-writing',
	'complex-reasoning',
	'conversation',
	'summarization',
	'translation',
	'multimodal',
	'function-calling',
	'structured-output',
];

function getNestedValue(obj, path) {
	const parts = path.split('.');
	let value = obj;
	for (const part of parts) {
		value = value?.[part];
	}
	return value;
}

function validateMetadataFile(filePath) {
	const errors = [];
	const warnings = [];

	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const data = JSON.parse(content);

		// Check required fields
		requiredFields.forEach((field) => {
			const value = getNestedValue(data, field);
			if (value === undefined || value === null) {
				errors.push(`Missing required field: ${field}`);
			}
		});

		// Validate intelligenceLevel
		if (data.intelligenceLevel && !validIntelligenceLevels.includes(data.intelligenceLevel)) {
			errors.push(
				`Invalid intelligenceLevel: "${data.intelligenceLevel}". Must be one of: ${validIntelligenceLevels.join(', ')}`,
			);
		}

		// Validate pricing values
		if (
			typeof data.pricing?.promptPerMilTokenUsd !== 'number' ||
			data.pricing.promptPerMilTokenUsd < 0
		) {
			errors.push('Invalid pricing.promptPerMilTokenUsd: must be a non-negative number');
		}
		if (
			typeof data.pricing?.completionPerMilTokenUsd !== 'number' ||
			data.pricing.completionPerMilTokenUsd < 0
		) {
			errors.push('Invalid pricing.completionPerMilTokenUsd: must be a non-negative number');
		}

		// Validate contextLength
		if (typeof data.contextLength !== 'number' || data.contextLength <= 0) {
			errors.push('Invalid contextLength: must be a positive number');
		}

		// Validate recommendedFor values
		if (data.recommendedFor) {
			if (!Array.isArray(data.recommendedFor)) {
				errors.push('recommendedFor must be an array');
			} else {
				data.recommendedFor.forEach((value) => {
					if (!validRecommendedFor.includes(value)) {
						warnings.push(
							`Non-standard recommendedFor value: "${value}". ` +
								`Recommended values: ${validRecommendedFor.join(', ')}`,
						);
					}
				});
			}
		}

		// Validate capabilities object
		if (data.capabilities && typeof data.capabilities !== 'object') {
			errors.push('capabilities must be an object');
		}

		// Check id matches filename
		const filename = path.basename(filePath, '.json');
		if (data.id !== filename) {
			warnings.push(`ID "${data.id}" doesn't match filename "${filename}.json"`);
		}
	} catch (error) {
		errors.push(`Failed to parse JSON: ${error.message}`);
	}

	return { errors, warnings };
}

async function validateAll() {
	const baseDir = process.argv[2] || '.';
	const metadataDir = path.resolve(baseDir, 'model-metadata');

	if (!fs.existsSync(metadataDir)) {
		console.log('No model-metadata directory found, skipping validation');
		return;
	}

	const files = await glob('model-metadata/**/*.json', {
		cwd: baseDir,
		ignore: ['**/node_modules/**', '**/schema.json', '**/README.md'],
	});

	if (files.length === 0) {
		console.log('No model metadata files found to validate');
		return;
	}

	let hasErrors = false;
	let hasWarnings = false;

	console.log(`Validating ${files.length} model metadata files...\n`);

	for (const file of files) {
		const filePath = path.resolve(baseDir, file);
		const { errors, warnings } = validateMetadataFile(filePath);

		if (errors.length > 0 || warnings.length > 0) {
			const relativePath = path.relative(metadataDir, filePath);
			console.log(`\n📄 ${relativePath}:`);

			if (errors.length > 0) {
				hasErrors = true;
				errors.forEach((err) => console.error(`  ❌ ${err}`));
			}

			if (warnings.length > 0) {
				hasWarnings = true;
				warnings.forEach((warn) => console.warn(`  ⚠️  ${warn}`));
			}
		}
	}

	console.log('\n');

	if (hasErrors) {
		console.error('❌ Model metadata validation failed with errors\n');
		process.exit(1);
	} else if (hasWarnings) {
		console.log('⚠️  Model metadata validation passed with warnings\n');
	} else {
		console.log('✅ All model metadata files are valid\n');
	}
}

validateAll().catch((error) => {
	console.error('Validation error:', error);
	process.exit(1);
});
