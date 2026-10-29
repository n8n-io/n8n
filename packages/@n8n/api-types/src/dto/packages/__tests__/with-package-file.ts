/** Adds a fake uploaded `package` file part to a multipart test fixture. */
export function withPackageFile<T extends Record<string, unknown>>(fields: T) {
	return {
		package: {
			fieldname: 'package',
			originalname: 'export.n8np',
			mimetype: 'application/gzip',
			size: 5,
			buffer: new Uint8Array([1, 2, 3, 4, 5]),
		},
		...fields,
	};
}
