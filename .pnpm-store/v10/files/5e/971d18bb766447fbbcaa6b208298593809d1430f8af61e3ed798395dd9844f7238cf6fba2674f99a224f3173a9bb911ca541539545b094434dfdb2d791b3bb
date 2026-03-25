const React = require('react');

module.exports = function FileBreadcrumbs({ fileFilter = '', setFileFilter }) {
    const parts = fileFilter.split('/');
    const breadcrumbs = [
        {
            path: '',
            name: 'all files'
        },
        ...parts.map((part, i) => ({
            path: parts.slice(0, i + 1).join('/'),
            name: part
        }))
    ];

    return breadcrumbs.map(({ path, name }) =>
        path === fileFilter ? (
            name
        ) : (
            <>
                <a
                    href="javascript:void(0)"
                    onClick={() => setFileFilter(path)}
                >
                    {name}
                </a>
                /
            </>
        )
    );
};
