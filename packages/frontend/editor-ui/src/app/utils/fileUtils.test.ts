import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from './fileUtils';

describe('sanitizeFilename', () => {
	it('should return normal filenames unchanged', () => {
		expect(sanitizeFilename('normalfile')).toBe('normalfile');
		expect(sanitizeFilename('my-file_v2')).toBe('my-file_v2');
	});

	it('should handle empty and invalid inputs', () => {
		expect(sanitizeFilename('')).toBe('untitled');
		expect(sanitizeFilename(null as unknown as string)).toBe('untitled');
		expect(sanitizeFilename(undefined as unknown as string)).toBe('untitled');
		expect(sanitizeFilename('filename   ')).toBe('filename');
	});

	it('should replace forbidden characters', () => {
		expect(sanitizeFilename('hello:world')).toBe('hello_world');
		expect(sanitizeFilename('file<name>')).toBe('file_name_');
		expect(sanitizeFilename('file/name')).toBe('file_name');
		expect(sanitizeFilename('file|name')).toBe('file_name');
	});

	it('should handle Unicode characters', () => {
		expect(sanitizeFilename('file\u200Bname')).toBe('filename'); // Zero-width space
		expect(sanitizeFilename('file\u00A0name')).toBe('file name'); // Non-breaking space
	});

	it('should handle edge cases', () => {
		expect(sanitizeFilename('.')).toBe('untitled');
		expect(sanitizeFilename('..')).toBe('untitled');
		expect(sanitizeFilename('   ...   ')).toBe('untitled');
	});

	it('should handle length limits', () => {
		const longName = 'a'.repeat(250);
		const result = sanitizeFilename(longName, 50);
		expect(result.length).toBeLessThanOrEqual(50);
	});

	// 15 most complex world languages (by writing system complexity)
	it('should support complex writing systems', () => {
		// 1. Arabic - Right-to-left, complex ligatures
		expect(sanitizeFilename('سير العمل الخاص بي')).toBe('سير العمل الخاص بي');

		// 2. Burmese - Complex script with stacked characters
		expect(sanitizeFilename('ကျွန်ုပ်၏ လုပ်ငန်းစဉ်')).toBe('ကျွန်ုပ်၏ လုပ်ငန်းစဉ်');

		// 3. Thai - Complex script, no word separators
		expect(sanitizeFilename('เวิร์กโฟลว์ของฉัน')).toBe('เวิร์กโฟลว์ของฉัน');

		// 4. Hindi - Devanagari script with complex conjuncts
		expect(sanitizeFilename('मेरा वर्कफ़्लो')).toBe('मेरा वर्कफ़्लो');

		// 5. Bengali - Complex script with conjunct consonants
		expect(sanitizeFilename('আমার ওয়ার্কফ্লো')).toBe('আমার ওয়ার্কফ্লো');

		// 6. Urdu - Right-to-left, Arabic-based script
		expect(sanitizeFilename('میرا ورک فلو')).toBe('میرا ورک فلو');

		// 7. Chinese - Logographic writing system
		expect(sanitizeFilename('我的工作流')).toBe('我的工作流');

		// 8. Japanese - Mixed scripts (Hiragana, Katakana, Kanji)
		expect(sanitizeFilename('私のワークフロー')).toBe('私のワークフロー');

		// 9. Korean - Hangul syllabic blocks
		expect(sanitizeFilename('내 워크플로우')).toBe('내 워크플로우');

		// 10. Russian - Cyrillic script
		expect(sanitizeFilename('Мой рабочий процесс')).toBe('Мой рабочий процесс');

		// 11. Tamil - Complex script with vowel marks
		expect(sanitizeFilename('எனது பணிப்பாய்வு')).toBe('எனது பணிப்பாய்வு');

		// 12. Telugu - Complex script with conjunct consonants
		expect(sanitizeFilename('నా వర్క్‌ఫ్లో')).toBe('నా వర్క్ఫ్లో');

		// 13. Marathi - Devanagari script
		expect(sanitizeFilename('माझा वर्कफ्लो')).toBe('माझा वर्कफ्लो');

		// 14. Gujarati - Complex script with vowel modifications
		expect(sanitizeFilename('મારો વર્કફ્લો')).toBe('મારો વર્કફ્લો');

		// 15. Punjabi - Gurmukhi script
		expect(sanitizeFilename('ਮੇਰਾ ਵਰਕਫਲੋ')).toBe('ਮੇਰਾ ਵਰਕਫਲੋ');
	});

	it('should handle mixed complex scripts with special characters', () => {
		expect(sanitizeFilename('工作流程/ワークフロー')).toBe('工作流程_ワークフロー');
		expect(sanitizeFilename('वर्कफ्लो:العمل')).toBe('वर्कफ्लो_العمل');
		expect(sanitizeFilename('프로세스|процесс')).toBe('프로세스_процесс');
	});
});
