import { sep as pathSep } from 'path';

export const isLocaleFile = (file: string): boolean =>
	file.endsWith('.json') && file.includes(`${pathSep}locales${pathSep}`);

export const extractLocale = (file: string): string | null => {
	const match = file.match(new RegExp(`${pathSep}locales${pathSep}([^${pathSep}]+)\\.json$`));
	return match?.[1] ?? null;
};

export const sendLocaleUpdate = (server: any, file: string): void => {
	if (!isLocaleFile(file)) return;
	const locale = extractLocale(file);
	server.ws.send({
		type: 'custom',
		event: 'n8n:locale-update',
		data: { locales: locale ? [locale] : [], file },
	});
};
