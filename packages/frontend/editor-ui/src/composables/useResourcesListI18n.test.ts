import type { I18nClass } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { useResourcesListI18n } from './useResourcesListI18n';
import { isBaseTextKey } from '@/utils/typeGuards';

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(),
}));

vi.mock('@/utils/typeGuards', () => ({
	isBaseTextKey: vi.fn(),
}));

const mockUseI18n = vi.mocked(useI18n);
const mockIsBaseTextKey = vi.mocked(isBaseTextKey);

describe('useResourcesListI18n', () => {
	let mockBaseText: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockBaseText = vi.fn();
		mockUseI18n.mockReturnValue({
			baseText: mockBaseText,
		} as Partial<I18nClass> as I18nClass);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getResourceText', () => {
		it('should return specific resource key translation when it exists', () => {
			const resourceKey = 'projects';
			const keySuffix = 'list.empty';
			mockIsBaseTextKey.mockReturnValueOnce(true); // specific key exists
			mockBaseText.mockReturnValue('No projects found');

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(mockIsBaseTextKey).toHaveBeenCalledWith('projects.list.empty');
			expect(mockBaseText).toHaveBeenCalledWith('projects.list.empty', { interpolate: undefined });
			expect(result).toBe('No projects found');
		});

		it('should return generic resource key translation when specific key does not exist', () => {
			const resourceKey = 'workflows';
			const keySuffix = 'list.empty';
			mockIsBaseTextKey
				.mockReturnValueOnce(false) // specific key doesn't exist
				.mockReturnValueOnce(true); // generic key exists
			mockBaseText.mockReturnValue('No resources found');

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(mockIsBaseTextKey).toHaveBeenCalledWith('workflows.list.empty');
			expect(mockIsBaseTextKey).toHaveBeenCalledWith('resources.list.empty');
			expect(mockBaseText).toHaveBeenCalledWith('resources.list.empty', { interpolate: undefined });
			expect(result).toBe('No resources found');
		});

		it('should return fallback key translation when neither specific nor generic key exists', () => {
			const resourceKey = 'credentials';
			const keySuffix = 'list.empty';
			const fallbackKeySuffix = 'list.noItems';
			mockIsBaseTextKey
				.mockReturnValueOnce(false) // specific key doesn't exist
				.mockReturnValueOnce(false) // generic key doesn't exist
				.mockReturnValueOnce(true); // fallback key exists
			mockBaseText.mockReturnValue('No items available');

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix, fallbackKeySuffix);

			expect(mockIsBaseTextKey).toHaveBeenCalledWith('credentials.list.empty');
			expect(mockIsBaseTextKey).toHaveBeenCalledWith('resources.list.empty');
			expect(mockIsBaseTextKey).toHaveBeenCalledWith('resources.list.noItems');
			expect(mockBaseText).toHaveBeenCalledWith('resources.list.noItems', {
				interpolate: undefined,
			});
			expect(result).toBe('No items available');
		});

		it('should return formatted fallback text when no translation keys exist', () => {
			const resourceKey = 'templates';
			const keySuffix = 'list.emptyState';
			mockIsBaseTextKey.mockReturnValue(false); // all keys don't exist

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('empty State'); // camelCase to readable format (doesn't capitalize first letter)
		});

		it('should return original keySuffix when formatting fails', () => {
			const resourceKey = 'projects';
			const keySuffix = 'complex.key.name';
			mockIsBaseTextKey.mockReturnValue(false); // all keys don't exist

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('name'); // last part of the key
		});

		it('should return keySuffix when split result is empty', () => {
			const resourceKey = 'projects';
			const keySuffix = '';
			mockIsBaseTextKey.mockReturnValue(false); // all keys don't exist

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('');
		});

		it('should pass interpolation parameters to translation', () => {
			const resourceKey = 'projects';
			const keySuffix = 'list.count';
			const interpolateParams = { count: '5' };
			mockIsBaseTextKey.mockReturnValue(true); // key exists
			mockBaseText.mockReturnValue('Found 5 projects');

			const { getResourceText } = useResourcesListI18n(resourceKey);
			getResourceText(keySuffix, undefined, interpolateParams);

			expect(mockBaseText).toHaveBeenCalledWith('projects.list.count', {
				interpolate: interpolateParams,
			});
		});

		it('should handle complex camelCase to readable format conversion', () => {
			const resourceKey = 'workflows';
			const keySuffix = 'status.isActiveAndRunning';
			mockIsBaseTextKey.mockReturnValue(false); // all keys don't exist

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('is Active And Running'); // doesn't capitalize first letter
		});
	});
});
