/**
 * Construct the plugin prefix out of the plugin's name.
 */
export function getPluginPrefix(name) {
    return name.endsWith('/eslint-plugin')
        ? name.split('/')[0] // Scoped plugin name like @my-scope/eslint-plugin.
        : name.replace('eslint-plugin-', ''); // Unscoped name like eslint-plugin-foo or scoped name like @my-scope/eslint-plugin-foo.
}
