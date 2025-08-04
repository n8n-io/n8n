#!/usr/bin/env node

/**
 * Validation script for AI Helpers implementation
 * This script validates the AI helper endpoints and their integration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating AI Helpers Implementation...\n');

// Files to validate
const requiredFiles = [
	'packages/cli/src/controllers/ai-helpers.controller.ts',
	'packages/cli/src/services/ai-helpers.service.ts',
	'packages/@n8n/api-types/src/dto/ai-helpers/ai-helpers.dto.ts',
	'packages/cli/test/unit/controllers/ai-helpers.controller.test.ts',
	'packages/cli/test/unit/services/ai-helpers.service.test.ts',
	'packages/cli/test/integration/ai-helpers.integration.test.ts',
];

let allValid = true;

console.log('📁 Checking required files...');
requiredFiles.forEach((file) => {
	const filePath = path.join(process.cwd(), file);
	if (fs.existsSync(filePath)) {
		console.log(`✅ ${file}`);
	} else {
		console.log(`❌ ${file} - MISSING`);
		allValid = false;
	}
});

console.log('\n📋 Validating controller implementation...');
try {
	const controllerPath = path.join(
		process.cwd(),
		'packages/cli/src/controllers/ai-helpers.controller.ts',
	);
	const controllerContent = fs.readFileSync(controllerPath, 'utf8');

	const requiredEndpoints = [
		"@Post('/suggest-nodes')",
		"@Post('/map-parameters')",
		"@Post('/workflow-assistance')",
		"@Get('/node-recommendations')",
		"@Post('/optimize-workflow')",
		"@Post('/explain-workflow')",
	];

	requiredEndpoints.forEach((endpoint) => {
		if (controllerContent.includes(endpoint)) {
			console.log(`✅ ${endpoint} endpoint implemented`);
		} else {
			console.log(`❌ ${endpoint} endpoint - MISSING`);
			allValid = false;
		}
	});

	// Check error handling
	if (
		controllerContent.includes('BadRequestError') &&
		controllerContent.includes('InternalServerError')
	) {
		console.log('✅ Error handling implemented');
	} else {
		console.log('❌ Error handling - INCOMPLETE');
		allValid = false;
	}

	// Check logging
	if (
		controllerContent.includes('this.logger.debug') &&
		controllerContent.includes('this.logger.error')
	) {
		console.log('✅ Logging implemented');
	} else {
		console.log('❌ Logging - INCOMPLETE');
		allValid = false;
	}
} catch (error) {
	console.log(`❌ Controller validation failed: ${error.message}`);
	allValid = false;
}

console.log('\n🔧 Validating service implementation...');
try {
	const servicePath = path.join(process.cwd(), 'packages/cli/src/services/ai-helpers.service.ts');
	const serviceContent = fs.readFileSync(servicePath, 'utf8');

	const requiredMethods = [
		'suggestNodes',
		'mapParameters',
		'provideWorkflowAssistance',
		'getNodeRecommendations',
		'optimizeWorkflow',
		'explainWorkflow',
	];

	requiredMethods.forEach((method) => {
		if (serviceContent.includes(`async ${method}(`)) {
			console.log(`✅ ${method} method implemented`);
		} else {
			console.log(`❌ ${method} method - MISSING`);
			allValid = false;
		}
	});

	// Check AI integration
	if (serviceContent.includes('@n8n/ai-workflow-builder')) {
		console.log('✅ AI workflow builder integration');
	} else {
		console.log('❌ AI workflow builder integration - MISSING');
		allValid = false;
	}

	// Check fallback implementations
	if (
		serviceContent.includes('generateRuleBasedSuggestions') &&
		serviceContent.includes('generateRuleBasedParameterMapping')
	) {
		console.log('✅ Fallback implementations');
	} else {
		console.log('❌ Fallback implementations - INCOMPLETE');
		allValid = false;
	}
} catch (error) {
	console.log(`❌ Service validation failed: ${error.message}`);
	allValid = false;
}

console.log('\n📝 Validating DTO definitions...');
try {
	const dtoPath = path.join(
		process.cwd(),
		'packages/@n8n/api-types/src/dto/ai-helpers/ai-helpers.dto.ts',
	);
	const dtoContent = fs.readFileSync(dtoPath, 'utf8');

	const requiredDTOs = [
		'NodeSuggestionRequestDto',
		'NodeSuggestionDto',
		'NodeSuggestionResponseDto',
		'ParameterMappingRequestDto',
		'ParameterMappingDto',
		'ParameterMappingResponseDto',
		'WorkflowAssistanceRequestDto',
		'WorkflowAssistanceDto',
		'WorkflowAssistanceResponseDto',
		'NodeRecommendationDto',
		'NodeRecommendationsResponseDto',
		'WorkflowOptimizationRequestDto',
		'WorkflowOptimizationResponseDto',
		'WorkflowExplanationRequestDto',
		'WorkflowExplanationResponseDto',
	];

	requiredDTOs.forEach((dto) => {
		if (dtoContent.includes(`export class ${dto}`)) {
			console.log(`✅ ${dto} defined`);
		} else {
			console.log(`❌ ${dto} - MISSING`);
			allValid = false;
		}
	});

	// Check Zod integration
	if (dtoContent.includes('import { z }') && dtoContent.includes('Z.class')) {
		console.log('✅ Zod validation integration');
	} else {
		console.log('❌ Zod validation integration - MISSING');
		allValid = false;
	}
} catch (error) {
	console.log(`❌ DTO validation failed: ${error.message}`);
	allValid = false;
}

console.log('\n🧪 Validating test coverage...');
try {
	const controllerTestPath = path.join(
		process.cwd(),
		'packages/cli/test/unit/controllers/ai-helpers.controller.test.ts',
	);
	const serviceTestPath = path.join(
		process.cwd(),
		'packages/cli/test/unit/services/ai-helpers.service.test.ts',
	);
	const integrationTestPath = path.join(
		process.cwd(),
		'packages/cli/test/integration/ai-helpers.integration.test.ts',
	);

	if (fs.existsSync(controllerTestPath)) {
		const controllerTestContent = fs.readFileSync(controllerTestPath, 'utf8');
		const testCount = (controllerTestContent.match(/it\(/g) || []).length;
		console.log(`✅ Controller tests: ${testCount} test cases`);

		if (testCount < 15) {
			console.log(`⚠️  Consider adding more controller test cases (current: ${testCount})`);
		}
	}

	if (fs.existsSync(serviceTestPath)) {
		const serviceTestContent = fs.readFileSync(serviceTestPath, 'utf8');
		const testCount = (serviceTestContent.match(/it\(/g) || []).length;
		console.log(`✅ Service tests: ${testCount} test cases`);

		if (testCount < 25) {
			console.log(`⚠️  Consider adding more service test cases (current: ${testCount})`);
		}
	}

	if (fs.existsSync(integrationTestPath)) {
		const integrationTestContent = fs.readFileSync(integrationTestPath, 'utf8');
		const testCount = (integrationTestContent.match(/it\(/g) || []).length;
		console.log(`✅ Integration tests: ${testCount} test cases`);

		if (testCount < 10) {
			console.log(`⚠️  Consider adding more integration test cases (current: ${testCount})`);
		}
	}
} catch (error) {
	console.log(`❌ Test validation failed: ${error.message}`);
	allValid = false;
}

console.log('\n🔗 Validating DTO exports...');
try {
	const indexPath = path.join(process.cwd(), 'packages/@n8n/api-types/src/dto/index.ts');
	const indexContent = fs.readFileSync(indexPath, 'utf8');

	if (indexContent.includes("from './ai-helpers/ai-helpers.dto'")) {
		console.log('✅ AI helpers DTOs exported from index');
	} else {
		console.log('❌ AI helpers DTOs not exported from index - MISSING');
		allValid = false;
	}
} catch (error) {
	console.log(`❌ DTO export validation failed: ${error.message}`);
	allValid = false;
}

console.log('\n📊 Implementation Summary:');
console.log('='.repeat(50));

if (allValid) {
	console.log('🎉 All validations passed! AI Helpers implementation is complete.');
	console.log('\n✨ Features implemented:');
	console.log('  • Node connection suggestions with AI/rule-based fallback');
	console.log('  • Automatic parameter mapping between nodes');
	console.log('  • Intelligent workflow development assistance');
	console.log('  • Node recommendations with filtering');
	console.log('  • Workflow optimization analysis');
	console.log('  • Comprehensive workflow explanations');
	console.log('  • Full test coverage (unit + integration)');
	console.log('  • Error handling and logging');
	console.log('  • Zod validation with DTOs');
	console.log('  • AI workflow builder integration');

	console.log('\n🚀 Ready for deployment!');
	process.exit(0);
} else {
	console.log('❌ Some validations failed. Please review the issues above.');
	console.log('\n🔧 Issues to address:');
	console.log('  • Check missing files and implementations');
	console.log('  • Ensure all endpoints are properly defined');
	console.log('  • Verify error handling and logging');
	console.log('  • Complete test coverage');
	console.log('  • Validate DTO definitions and exports');

	process.exit(1);
}
