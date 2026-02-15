/**
 * Manual test example for the deep lazy proxy
 * This file demonstrates how to use the proxy with workflow data
 * Run with: tsx src/proxy/__tests__/manual-test.example.ts
 */

import { createWorkflowDataProxy } from '../index';

// Create sample workflow data
const workflowData = {
	$json: {
		email: 'test@example.com',
		user: {
			name: 'John Doe',
			age: 30,
			address: {
				city: 'New York',
				country: 'USA',
			},
		},
		// Large array (will be lazy-loaded)
		items: Array(1000)
			.fill(0)
			.map((_, i) => ({ id: i, name: `Item ${i}`, data: 'x'.repeat(100) })),
		// Small array (will be transferred entirely)
		tags: ['javascript', 'typescript', 'nodejs'],
	},
	$runIndex: 0,
	$itemIndex: 0,
	$items: (index?: number) => {
		if (index !== undefined) {
			return [{ json: { id: index } }];
		}
		return [{ json: { id: 1 } }, { json: { id: 2 } }];
	},
};

// Create the proxy
const proxy = createWorkflowDataProxy(workflowData, {
	smallArrayThreshold: 100,
	debug: false,
});

console.log('=== Deep Lazy Proxy Manual Test ===\n');

// Test 1: Access simple property
console.log('1. Simple property access:');
console.log(`   Email: ${proxy.$json.email}`);
console.log(`   Type: ${typeof proxy.$json.email}\n`);

// Test 2: Access nested property
console.log('2. Nested property access:');
console.log(`   User name: ${proxy.$json.user.name}`);
console.log(`   City: ${proxy.$json.user.address.city}\n`);

// Test 3: Access small array (transferred entirely)
console.log('3. Small array (transferred entirely):');
console.log(`   Tags: ${proxy.$json.tags.join(', ')}`);
console.log(`   Length: ${proxy.$json.tags.length}\n`);

// Test 4: Access large array element (lazy-loaded)
console.log('4. Large array element (lazy-loaded):');
console.log(`   Item 500 ID: ${proxy.$json.items[500].id}`);
console.log(`   Item 500 Name: ${proxy.$json.items[500].name}`);
console.log(`   Array length: ${proxy.$json.items.length}\n`);

// Test 5: Access function
console.log('5. Function access:');
console.log(`   $items function type: ${typeof proxy.$items}`);
console.log(`   $items(): ${JSON.stringify(proxy.$items())}`);
console.log(`   $items(5): ${JSON.stringify(proxy.$items(5))}\n`);

// Test 6: Access primitives
console.log('6. Primitive values:');
console.log(`   $runIndex: ${proxy.$runIndex}`);
console.log(`   $itemIndex: ${proxy.$itemIndex}\n`);

// Test 7: Test caching
console.log('7. Caching test:');
const firstAccess = proxy.$json.user.name;
const secondAccess = proxy.$json.user.name;
console.log(`   First access: ${firstAccess}`);
console.log(`   Second access: ${secondAccess}`);
console.log(`   Same reference: ${firstAccess === secondAccess}\n`);

// Test 8: Test "in" operator
console.log('8. "in" operator test:');
console.log(`   'email' in proxy.$json: ${'email' in proxy.$json}`);
console.log(`   'missing' in proxy.$json: ${'missing' in proxy.$json}\n`);

console.log('=== All tests completed successfully ===');
