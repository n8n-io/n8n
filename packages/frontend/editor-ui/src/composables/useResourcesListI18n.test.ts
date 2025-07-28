import type { I18nClass } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { useResourcesListI18n } from './useResourcesListI18n';

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(),
}));

const mockUseI18n = vi.mocked(useI18n);

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
			mockBaseText
				.mockReturnValueOnce('No projects found') // first call to check if key exists
				.mockReturnValueOnce('No projects found'); // second call to get the actual translation

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(mockBaseText).toHaveBeenCalledWith('projects.list.empty');
			expect(mockBaseText).toHaveBeenCalledWith('projects.list.empty', { interpolate: undefined });
			expect(result).toBe('No projects found');
		});

		it('should return generic resource key translation when specific key does not exist', () => {
			const resourceKey = 'workflows';
			const keySuffix = 'list.empty';
			mockBaseText
				.mockReturnValueOnce('') // specific key doesn't exist
				.mockReturnValueOnce('No resources found') // generic key exists (check)
				.mockReturnValueOnce('No resources found'); // generic key exists (get value)

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(mockBaseText).toHaveBeenCalledWith('workflows.list.empty');
			expect(mockBaseText).toHaveBeenCalledWith('resources.list.empty');
			expect(mockBaseText).toHaveBeenCalledWith('resources.list.empty', { interpolate: undefined });
			expect(result).toBe('No resources found');
		});

		it('should return fallback key translation when neither specific nor generic key exists', () => {
			const resourceKey = 'credentials';
			const keySuffix = 'list.empty';
			const fallbackKeySuffix = 'list.noItems';
			mockBaseText
				.mockReturnValueOnce('') // specific key doesn't exist
				.mockReturnValueOnce('') // generic key doesn't exist
				.mockReturnValueOnce('No items available') // fallback key exists (check)
				.mockReturnValueOnce('No items available'); // fallback key exists (get value)

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix, fallbackKeySuffix);

			expect(mockBaseText).toHaveBeenCalledWith('credentials.list.empty');
			expect(mockBaseText).toHaveBeenCalledWith('resources.list.empty');
			expect(mockBaseText).toHaveBeenCalledWith('resources.list.noItems');
			expect(mockBaseText).toHaveBeenCalledWith('resources.list.noItems', {
				interpolate: undefined,
			});
			expect(result).toBe('No items available');
		});

		it('should return formatted fallback text when no translation keys exist', () => {
			const resourceKey = 'templates';
			const keySuffix = 'list.emptyState';
			mockBaseText.mockReturnValue(''); // all keys return empty

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('empty State'); // camelCase to readable format (doesn't capitalize first letter)
		});

		it('should return original keySuffix when formatting fails', () => {
			const resourceKey = 'projects';
			const keySuffix = 'complex.key.name';
			mockBaseText.mockReturnValue('');

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('name'); // last part of the key
		});

		it('should return keySuffix when split result is empty', () => {
			const resourceKey = 'projects';
			const keySuffix = '';
			mockBaseText.mockReturnValue('');

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('');
		});

		it('should pass interpolation parameters to translation', () => {
			const resourceKey = 'projects';
			const keySuffix = 'list.count';
			const interpolateParams = { count: '5' };
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
			mockBaseText.mockReturnValue('');

			const { getResourceText } = useResourcesListI18n(resourceKey);
			const result = getResourceText(keySuffix);

			expect(result).toBe('is Active And Running'); // doesn't capitalize first letter
		});
	});
});
