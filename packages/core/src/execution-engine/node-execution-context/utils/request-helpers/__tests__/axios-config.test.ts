import axios from 'axios';

// Import the module so its interceptors are registered.
import '../axios-config';

describe('axios-config interceptor header handling', () => {
  const getLastRequestHandler = () => {
    const req: any = (axios.interceptors.request as any);
    const handlers = req.handlers || [];
    return handlers[handlers.length - 1].fulfilled;
  };

  test('removes Content-Type when config.data is undefined and headers is plain object', async () => {
    const handler = getLastRequestHandler();
    const cfg: any = {
      data: undefined,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    };

    const result = await handler(cfg);

    // Content-Type should be removed to prevent axios from forcing urlencoded
    const keys = Object.keys(result.headers).map((k) => k.toLowerCase());
    expect(keys).not.toContain('content-type');
    expect(result.headers.accept).toBe('application/json');
  });

  test('calls setContentType when headers exposes setContentType function', async () => {
    const handler = getLastRequestHandler();
    const setContentType = jest.fn();
    const cfg: any = {
      data: undefined,
      headers: {
        setContentType,
      },
    };

    await handler(cfg);

    expect(setContentType).toHaveBeenCalledWith(false, false);
  });
});
