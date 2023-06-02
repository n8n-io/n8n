import { makeRestApiRequest } from '@/utils';
import type { IRestApiContext, ExternalSecretsProvider } from '@/Interface';

const infisical = {
	id: 'infisical',
	name: 'Infisical',
	image:
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAANPSURBVHgB7VVJTFNRFD39baFFgpYpwdpSYMFQMGGDEQwIbGSDRoWuMFFXDmFyZ8C41BjFiFFiZBCNCu7UAEEsJohhjCAGNoKUMhkGsdBWOn3fe9CGlhJYkC4MZ/XfzX333HvuefnA/w7BAVloO3wISsjDh+DgY+wR7jpE3oICgcD1zfP8lrGNcbcYx9GAW2xLQmeBkJAQKBUKqKJUEJICk5NT+DE6isXFRTgcDlaM5vqJxQgNC0N8fBxCyR2T2QSdbgIjIyOwWm2bSL0SRkdHo7SkGKmpR8klC7skJoUHB7+hquoJvg4MwGKxYH9QEDKzjuNcQQFiYmJgMhnh7y+BUMihtrYOL1+9xtzcPGvQCaFEGnDTdRAKcUguR0lJEVJSUtDc3Ixn9S/Q+qEVc/PzSE5ORkZGOnTjOiwsLCA/7yyuXL6EFaMR9fXP0dD4Br09fbDbbdBoNLDb7Bga+g6rzcYkdpuQTkanSEtLJWRHUFn5EG/fvYfZbCYF7Oju6UVn5xdcKy1GWfl19JBzdlYmurq68ehxFSZ0eliIGiKRCNp2LcR+fsjJOYGOjs/o6++nBEwpbiMhTY6KisLS0m9Gtry8DBvpjhKajCb09fWj4v4DSCVSXLxwHuNk0rv3KjA6Ogbz6lpjVqsVBsMyGhoawXECKCMVcPBE0nXPuT+LdSNQ33gu23k2m/+y/XHESEaTmXxb1xM8vbCmokDgTuE60cVSrfV6PSIiDiI9/RiTmBYWk8klEn/ExcWhqKiQKCFkExxOUqOw8CoilUqmDs2j+YGB+5Cdnc0m/DU7y4bgHfxm01BQGWNjY4kh8pjl6TRhxPbpxCwlxUWQyyNw6/Yd1NbVkSakOHP6FJKSEvHHYGBS02ek0eRBk5+PlpZWNDU1M1Vc79nzb0E7TUxU40Z5GVQqFYzGFbIDHhJi95mZGTytrkZbmxarq6sIDpaR4vk4mZsLmUxGco2QSiVkMiE+arWoqanFz7Fx2IhrXVJ7+z1RWcLDw6FWJ5ClK8GRPUyRhz88Mozp6RlmJCcCAgKgUMiRkKAmd8LYXicn9BgYHCTmMbi9wS0J3RK4tTXzHhe9gTbKb5MrwjbYCZETjp00BR9jj3DXISK2+oQ97CL+AcBYbuFaVRkOAAAAAElFTkSuQmCC',
	secrets: [],
	connected: true,
	connectedAt: '2021-09-01T00:00:00.000Z',
};

export const getExternalSecretsProviders = async (
	context: IRestApiContext,
): Promise<ExternalSecretsProvider[]> => {
	return [infisical];
	// return makeRestApiRequest(context, 'GET', '/external-secrets/providers');
};

export const getExternalSecretsProvider = async (
	context: IRestApiContext,
	id: string,
): Promise<ExternalSecretsProvider> => {
	return infisical;
	// return makeRestApiRequest(context, 'GET', '/external-secrets/provider/infisical');
};
