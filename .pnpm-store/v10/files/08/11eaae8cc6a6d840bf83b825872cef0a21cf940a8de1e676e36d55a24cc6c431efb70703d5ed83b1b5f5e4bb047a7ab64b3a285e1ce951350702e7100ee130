import { multipartType } from '../plugins/multipart.js';
import { querystringType } from '../plugins/querystring.js';

const firstValues = (form, fields, exceptions = []) => {
  if (form.type !== querystringType && form.type !== multipartType) {
    return fields;
  }

  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      if (exceptions.includes(key)) {
        return [key, value];
      }
      return [key, value[0]];
    }),
  );
};

export { firstValues };
