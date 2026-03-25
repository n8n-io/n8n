import { RedoclyClient } from '../redocly';

describe.skip('login', () => {
  it('should call login with setAccessTokens function', async () => {
    const client = new RedoclyClient();
    Object.defineProperty(client, 'registryApi', {
      value: {
        setAccessTokens: jest.fn(),
        authStatus: jest.fn(() => true),
      },
      writable: true,
      configurable: true,
    });
    await client.login('token'); // TODO: bug with rewrite local config file
    expect(client.registryApi.setAccessTokens).toHaveBeenCalled();
  });
});
