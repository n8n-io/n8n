import { CommaSeparatedStringArray, ColonSeparatedStringArray } from '../src/custom-types';

describe('CommaSeparatedStringArray', () => {
	describe('Basic functionality', () => {
		it('should parse comma-separated string into array', () => {
			const result = new CommaSeparatedStringArray('a,b,c');
			expect(result).toEqual(['a', 'b', 'c']);
			expect(result).toBeInstanceOf(Array);
			// Note: Due to the way the class extends Array, instanceof check may not work as expected
			// The functionality is what matters - it parses the string correctly
		});

		it('should handle single item', () => {
			const result = new CommaSeparatedStringArray('single');
			expect(result).toEqual(['single']);
		});

		it('should handle empty string input', () => {
			const result = new CommaSeparatedStringArray('');
			expect(result).toEqual([]);
		});

		it('should handle whitespace-only input', () => {
			const result = new CommaSeparatedStringArray('   ');
			expect(result).toEqual(['   ']);
		});
	});

	describe('Empty value filtering', () => {
		it('should filter out empty strings', () => {
			const result = new CommaSeparatedStringArray('a,b,,,');
			expect(result).toEqual(['a', 'b']);
		});

		it('should filter out empty strings at the beginning', () => {
			const result = new CommaSeparatedStringArray(',a,b,c');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should filter out empty strings at the end', () => {
			const result = new CommaSeparatedStringArray('a,b,c,');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should handle multiple consecutive commas', () => {
			const result = new CommaSeparatedStringArray('a,,,b,,,c');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should handle string with only commas', () => {
			const result = new CommaSeparatedStringArray(',,,');
			expect(result).toEqual([]);
		});
	});

	describe('Special characters and edge cases', () => {
		it('should handle values with spaces', () => {
			const result = new CommaSeparatedStringArray('hello world,foo bar,baz qux');
			expect(result).toEqual(['hello world', 'foo bar', 'baz qux']);
		});

		it('should handle values with special characters', () => {
			const result = new CommaSeparatedStringArray(
				'test@example.com,user+tag@domain.org,admin#123',
			);
			expect(result).toEqual(['test@example.com', 'user+tag@domain.org', 'admin#123']);
		});

		it('should handle values with quotes', () => {
			const result = new CommaSeparatedStringArray('"quoted value","another \'quoted\' value"');
			expect(result).toEqual(['"quoted value"', '"another \'quoted\' value"']);
		});

		it('should handle values with escape characters', () => {
			const result = new CommaSeparatedStringArray('path\\to\\file,another\\path\\file');
			expect(result).toEqual(['path\\to\\file', 'another\\path\\file']);
		});

		it('should handle unicode characters', () => {
			const result = new CommaSeparatedStringArray('café,naïve,résumé,🚀');
			expect(result).toEqual(['café', 'naïve', 'résumé', '🚀']);
		});

		it('should handle numbers as strings', () => {
			const result = new CommaSeparatedStringArray('1,2,3,4.5,-6');
			expect(result).toEqual(['1', '2', '3', '4.5', '-6']);
		});

		it('should handle boolean-like strings', () => {
			const result = new CommaSeparatedStringArray('true,false,TRUE,FALSE');
			expect(result).toEqual(['true', 'false', 'TRUE', 'FALSE']);
		});
	});

	describe('Array methods and properties', () => {
		it('should maintain array prototype methods', () => {
			const result = new CommaSeparatedStringArray('a,b,c');
			expect(result.length).toBe(3);
			expect(result.join('|')).toBe('a|b|c');
			expect(result.indexOf('b')).toBe(1);
			expect(result.includes('c')).toBe(true);
		});

		it('should support array iteration', () => {
			const result = new CommaSeparatedStringArray('x,y,z');
			const items = [];
			for (const item of result) {
				items.push(item);
			}
			expect(items).toEqual(['x', 'y', 'z']);
		});

		it('should support map operation', () => {
			const result = new CommaSeparatedStringArray('1,2,3');
			const mapped = result.map((item) => item + '!');
			expect(mapped).toEqual(['1!', '2!', '3!']);
		});

		it('should support filter operation', () => {
			const result = new CommaSeparatedStringArray('apple,banana,cherry');
			const filtered = result.filter((item) => item.includes('a'));
			expect(filtered).toEqual(['apple', 'banana']);
		});
	});

	describe('Type safety', () => {
		it('should work with typed generics', () => {
			type ValidOption = 'option1' | 'option2' | 'option3';
			const result = new CommaSeparatedStringArray<ValidOption>('option1,option2');
			expect(result).toEqual(['option1', 'option2']);
		});

		it('should handle empty array correctly', () => {
			const result = new CommaSeparatedStringArray('');
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBe(0);
		});
	});

	describe('Real-world use cases', () => {
		it('should handle environment variable lists', () => {
			const result = new CommaSeparatedStringArray('NODE_ENV,PORT,DATABASE_URL');
			expect(result).toEqual(['NODE_ENV', 'PORT', 'DATABASE_URL']);
		});

		it('should handle feature flag lists', () => {
			const result = new CommaSeparatedStringArray('feature-a,feature-b,experimental-feature');
			expect(result).toEqual(['feature-a', 'feature-b', 'experimental-feature']);
		});

		it('should handle API endpoint lists', () => {
			const result = new CommaSeparatedStringArray('/api/v1/users,/api/v1/posts,/api/v1/comments');
			expect(result).toEqual(['/api/v1/users', '/api/v1/posts', '/api/v1/comments']);
		});

		it('should handle node types list', () => {
			const result = new CommaSeparatedStringArray(
				'n8n-nodes-base.httpRequest,n8n-nodes-base.webhook,custom-node',
			);
			expect(result).toEqual([
				'n8n-nodes-base.httpRequest',
				'n8n-nodes-base.webhook',
				'custom-node',
			]);
		});
	});
});

describe('ColonSeparatedStringArray', () => {
	describe('Basic functionality', () => {
		it('should parse colon-separated string into array', () => {
			const result = new ColonSeparatedStringArray('a:b:c');
			expect(result).toEqual(['a', 'b', 'c']);
			expect(result).toBeInstanceOf(Array);
			// Note: Due to the way the class extends Array, instanceof check may not work as expected
			// The functionality is what matters - it parses the string correctly
		});

		it('should handle single item', () => {
			const result = new ColonSeparatedStringArray('single');
			expect(result).toEqual(['single']);
		});

		it('should handle empty string input', () => {
			const result = new ColonSeparatedStringArray('');
			expect(result).toEqual([]);
		});

		it('should handle whitespace-only input', () => {
			const result = new ColonSeparatedStringArray('   ');
			expect(result).toEqual(['   ']);
		});
	});

	describe('Empty value filtering', () => {
		it('should filter out empty strings', () => {
			const result = new ColonSeparatedStringArray('a::b:::');
			expect(result).toEqual(['a', 'b']);
		});

		it('should filter out empty strings at the beginning', () => {
			const result = new ColonSeparatedStringArray(':a:b:c');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should filter out empty strings at the end', () => {
			const result = new ColonSeparatedStringArray('a:b:c:');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should handle multiple consecutive colons', () => {
			const result = new ColonSeparatedStringArray('a:::b:::c');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should handle string with only colons', () => {
			const result = new ColonSeparatedStringArray(':::');
			expect(result).toEqual([]);
		});
	});

	describe('Special characters and edge cases', () => {
		it('should handle values with spaces', () => {
			const result = new ColonSeparatedStringArray('hello world:foo bar:baz qux');
			expect(result).toEqual(['hello world', 'foo bar', 'baz qux']);
		});

		it('should handle path-like values', () => {
			const result = new ColonSeparatedStringArray('/usr/bin:/usr/local/bin:/opt/bin');
			expect(result).toEqual(['/usr/bin', '/usr/local/bin', '/opt/bin']);
		});

		it('should handle URL-like values', () => {
			const result = new ColonSeparatedStringArray(
				'http://localhost:3000:https://api.example.com:ws://socket.io',
			);
			expect(result).toEqual([
				'http',
				'//localhost',
				'3000',
				'https',
				'//api.example.com',
				'ws',
				'//socket.io',
			]);
		});

		it('should handle values with special characters', () => {
			const result = new ColonSeparatedStringArray('key=value:param@host:user#tag');
			expect(result).toEqual(['key=value', 'param@host', 'user#tag']);
		});

		it('should handle unicode characters', () => {
			const result = new ColonSeparatedStringArray('français:español:中文:العربية');
			expect(result).toEqual(['français', 'español', '中文', 'العربية']);
		});

		it('should handle numbers as strings', () => {
			const result = new ColonSeparatedStringArray('1:2:3:4.5:-6');
			expect(result).toEqual(['1', '2', '3', '4.5', '-6']);
		});

		it('should handle boolean-like strings', () => {
			const result = new ColonSeparatedStringArray('true:false:TRUE:FALSE');
			expect(result).toEqual(['true', 'false', 'TRUE', 'FALSE']);
		});
	});

	describe('Array methods and properties', () => {
		it('should maintain array prototype methods', () => {
			const result = new ColonSeparatedStringArray('x:y:z');
			expect(result.length).toBe(3);
			expect(result.join('|')).toBe('x|y|z');
			expect(result.indexOf('y')).toBe(1);
			expect(result.includes('z')).toBe(true);
		});

		it('should support array iteration', () => {
			const result = new ColonSeparatedStringArray('alpha:beta:gamma');
			const items = [];
			for (const item of result) {
				items.push(item);
			}
			expect(items).toEqual(['alpha', 'beta', 'gamma']);
		});

		it('should support map operation', () => {
			const result = new ColonSeparatedStringArray('a:b:c');
			const mapped = result.map((item) => item.toUpperCase());
			expect(mapped).toEqual(['A', 'B', 'C']);
		});

		it('should support filter operation', () => {
			const result = new ColonSeparatedStringArray('apple:orange:banana:grape');
			const filtered = result.filter((item) => item.length > 5);
			expect(filtered).toEqual(['orange', 'banana']);
		});
	});

	describe('Type safety', () => {
		it('should work with typed generics', () => {
			type Environment = 'development' | 'staging' | 'production';
			const result = new ColonSeparatedStringArray<Environment>('development:staging');
			expect(result).toEqual(['development', 'staging']);
		});

		it('should handle empty array correctly', () => {
			const result = new ColonSeparatedStringArray('');
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBe(0);
		});
	});

	describe('Real-world use cases', () => {
		it('should handle PATH environment variable', () => {
			const result = new ColonSeparatedStringArray('/usr/local/bin:/usr/bin:/bin');
			expect(result).toEqual(['/usr/local/bin', '/usr/bin', '/bin']);
		});

		it('should handle classpath-like values', () => {
			const result = new ColonSeparatedStringArray(
				'/app/lib/app.jar:/app/lib/deps.jar:/app/config',
			);
			expect(result).toEqual(['/app/lib/app.jar', '/app/lib/deps.jar', '/app/config']);
		});

		it('should handle database connection strings', () => {
			const result = new ColonSeparatedStringArray('host1:5432:host2:5433:host3:5434');
			expect(result).toEqual(['host1', '5432', 'host2', '5433', 'host3', '5434']);
		});

		it('should handle module path lists', () => {
			const result = new ColonSeparatedStringArray('src/modules:lib/modules:node_modules');
			expect(result).toEqual(['src/modules', 'lib/modules', 'node_modules']);
		});
	});

	describe('Comparison with CommaSeparatedStringArray', () => {
		it('should handle the same input with different delimiters', () => {
			const commaResult = new CommaSeparatedStringArray('a,b,c');
			const colonResult = new ColonSeparatedStringArray('a:b:c');
			expect(commaResult).toEqual(['a', 'b', 'c']);
			expect(colonResult).toEqual(['a', 'b', 'c']);
			expect(commaResult).toEqual(colonResult);
		});

		it('should handle different delimiters correctly', () => {
			const commaResult = new CommaSeparatedStringArray('a:b:c'); // Contains colons as data
			const colonResult = new ColonSeparatedStringArray('a,b,c'); // Contains commas as data
			expect(commaResult).toEqual(['a:b:c']);
			expect(colonResult).toEqual(['a,b,c']);
		});
	});

	describe('Edge case behaviors', () => {
		it('should handle mixed empty and non-empty values', () => {
			const result = new ColonSeparatedStringArray(':valid::another:');
			expect(result).toEqual(['valid', 'another']);
		});

		it('should preserve leading/trailing whitespace in values', () => {
			const result = new ColonSeparatedStringArray(' value1 : value2 : value3 ');
			expect(result).toEqual([' value1 ', ' value2 ', ' value3 ']);
		});

		it('should handle very long strings', () => {
			const longValue = 'a'.repeat(1000);
			const result = new ColonSeparatedStringArray(`${longValue}:b:${longValue}`);
			expect(result).toEqual([longValue, 'b', longValue]);
			expect(result.length).toBe(3);
		});
	});
});
