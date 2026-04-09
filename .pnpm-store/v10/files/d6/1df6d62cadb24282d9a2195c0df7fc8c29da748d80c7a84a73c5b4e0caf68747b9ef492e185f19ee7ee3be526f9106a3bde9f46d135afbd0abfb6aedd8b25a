/**
 * Converts an input object to FormData for multipart/form-data requests.
 *
 * Handles the following cases:
 * - `null` or `undefined` values are skipped
 * - Arrays with a single element are appended as a single value
 * - Arrays with multiple elements are appended with `[]` suffix (e.g., `image[]`)
 *   unless `useArrayBrackets` is set to `false`
 * - All other values are appended directly
 *
 * @param input - The input object to convert. Use a generic type for type validation.
 * @param options - Optional configuration object.
 * @param options.useArrayBrackets - Whether to add `[]` suffix for multi-element arrays.
 *   Defaults to `true`. Set to `false` for APIs that expect repeated keys without brackets.
 * @returns A FormData object containing the input values.
 *
 * @example
 * ```ts
 * type MyInput = {
 *   model: string;
 *   prompt: string;
 *   images: Blob[];
 * };
 *
 * const formData = convertToFormData<MyInput>({
 *   model: 'gpt-image-1',
 *   prompt: 'A cat',
 *   images: [blob1, blob2],
 * });
 * ```
 */
export function convertToFormData<T extends Record<string, unknown>>(
  input: T,
  options: { useArrayBrackets?: boolean } = {},
): FormData {
  const { useArrayBrackets = true } = options;
  const formData = new FormData();

  for (const [key, value] of Object.entries(input)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 1) {
        formData.append(key, value[0] as string | Blob);
        continue;
      }

      const arrayKey = useArrayBrackets ? `${key}[]` : key;
      for (const item of value) {
        formData.append(arrayKey, item as string | Blob);
      }
      continue;
    }

    formData.append(key, value as string | Blob);
  }

  return formData;
}
