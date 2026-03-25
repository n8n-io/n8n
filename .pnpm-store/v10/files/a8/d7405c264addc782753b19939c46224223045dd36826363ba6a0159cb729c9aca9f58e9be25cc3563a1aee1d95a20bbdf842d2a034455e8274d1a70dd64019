/**
 * The secret detector detects sensitive information.
 * It masks secrets that might be leaked from two potential avenues
 *  1. Out of Band Telemetry
 *  2. Logging
 *  
* @param {Object} customPatterns contains 'regex' and 'mask' for customized masking
 * @param {Object} mock
 * 
 * @returns {Object}
 * @constructor
 */
function SecretDetector(customPatterns, mock) {
  const CUSTOM_PATTERNS_REGEX = [];
  const CUSTOM_PATTERNS_MASK = [];
  let CUSTOM_PATTERNS_LENGTH;

  if (customPatterns) {
    // Check that the customPatterns object contains the keys 'regex' and 'mask
    if (!customPatterns.regex) {
      throw new Error('The customPatterns object must contain the \'regex\' key');
    }
    if (!customPatterns.mask) {
      throw new Error('The customPatterns object must contain the \'mask\' key');
    }
    // Also check that their lengths are equal
    if (customPatterns.regex.length !== customPatterns.mask.length) {
      throw new Error('The customPatterns object must have equal length for both \'regex\' and \'mask\'');
    }

    CUSTOM_PATTERNS_LENGTH = customPatterns.regex.length;

    // Push the regex and mask elements onto their respective arrays
    for (let index = 0; index < CUSTOM_PATTERNS_LENGTH; index++) {
      CUSTOM_PATTERNS_REGEX.push(new RegExp(`${customPatterns.regex[index]}`, 'gi'));
      CUSTOM_PATTERNS_MASK.push(String.raw`${customPatterns.mask[index]}`);
    }
  }

  function maskCustomPattern(text) {
    let result;
    for (let index = 0; index < CUSTOM_PATTERNS_LENGTH; index++) {
      result = text.replace(CUSTOM_PATTERNS_REGEX[index], CUSTOM_PATTERNS_MASK[index]);
      // If the text is replaced, return the result
      if (text !== result) {
        return result;
      }
    }
    // If text is unchanged, return the original
    return text;
  }

  const AWS_KEY_PATTERN = new RegExp(String.raw`(aws_key_id|aws_secret_key|access_key_id|secret_access_key)\s*=\s*'([^']+)'`,
    'gi');
  const AWS_TOKEN_PATTERN = new RegExp(String.raw`(accessToken|tempToken|keySecret)\s*:\s*"([a-z0-9/+]{32,}={0,2})"`,
    'gi');
  const SAS_TOKEN_PATTERN = new RegExp(String.raw`(sig|signature|AWSAccessKeyId|password|passcode)=(\?P<secret>[a-z0-9%/+]{16,})`,
    'gi');
  const PRIVATE_KEY_PATTERN = new RegExp(String.raw`-----BEGIN PRIVATE KEY-----\\n([a-z0-9/+=\\n]{32,})\\n-----END PRIVATE KEY-----`, // pragma: allowlist secret
    'gim');
  const PRIVATE_KEY_DATA_PATTERN = new RegExp(String.raw`"privateKeyData": "([a-z0-9/+=\\n]{10,})"`,
    'gim');
  // Colon in the group ([a-z0-9=/:_%-+]{8,}) was added to detect tokens that contain additional details before the actual token.
  // Such as version or hint (token=ver:1-hint:1233-realToken...).
  const CONNECTION_TOKEN_PATTERN = new RegExp(String.raw`(token|assertion content)([\'\"\s:=]+)([a-z0-9=/:_\%\-\+]{8,})`,
    'gi');
  const PASSWORD_PATTERN = new RegExp(
    String.raw`(password|pwd)([\'\"\s:=]+)([a-z0-9!\"#\$%&\\\'\(\)\*\+\,-\./:;<=>\?\@\[\]\^_` +
    '`' +
    String.raw`\{\|\}~]{8,})`,
    'gi');
  const PASSCODE_PATTERN = new RegExp(String.raw`(passcode|otp|pin|otac)\s*([:=])\s*([0-9]{4,6})`, 'gi');

  const OAUTH_CLIENT_SECRET_PATTERN = new RegExp(String.raw`(oauthClientId|oauthClientSecret|clientSecret)([\'\"\s:=]+)([a-z0-9!\"#\$%&\\\'\(\)\*\+\,-\./:;<=>\?\@\[\]\^_` +
    '`' +
    String.raw`\{\|\}~]{8,})`,
  'gi');

  function maskAwsKeys(text) {
    return text.replace(AWS_KEY_PATTERN, String.raw`$1$2****`);
  }

  function maskAwsToken(text) {
    return text.replace(AWS_TOKEN_PATTERN, String.raw`$1":"XXXX"`);
  }

  function maskSasToken(text) {
    return text.replace(SAS_TOKEN_PATTERN, String.raw`$1=****`);
  }

  function maskPrivateKey(text) {
    return text.replace(PRIVATE_KEY_PATTERN, String.raw`-----BEGIN PRIVATE KEY-----\\\\nXXXX\\\\n-----END PRIVATE KEY-----`); // pragma: allowlist secret
  }

  function maskPrivateKeyData(text) {
    return text.replace(PRIVATE_KEY_DATA_PATTERN, String.raw`"privateKeyData": "XXXX"`);
  }

  function maskConnectionToken(text) {
    return text.replace(CONNECTION_TOKEN_PATTERN, String.raw`$1$2****`);
  }

  function maskPassword(text) {
    return text.replace(PASSWORD_PATTERN, String.raw`$1$2****`);
  }

  function maskPasscode(text) {
    return text.replace(PASSCODE_PATTERN, String.raw`$1$2****`);
  }


  function maskClientSecret(text) {
    return text.replace(OAUTH_CLIENT_SECRET_PATTERN, String.raw`$1$2****`);
  }


  /**
   * Masks any secrets.
   *
   * @param {String} text may contain a secret.
   *
   * @returns {Object} the masked string.
   */
  this.maskSecrets = function (text) {
    let result;
    if (!text) {
      result =
      {
        masked: false,
        maskedtxt: text,
        errstr: null
      };
      return result;
    }

    let masked = false;
    let maskedtxt = '';
    let errstr = null;
    try {
      if (mock) {
        mock.execute();
      }

      maskedtxt =
        maskClientSecret(
          maskPasscode(
            maskConnectionToken(
              maskPassword(
                maskPrivateKeyData(
                  maskPrivateKey(
                    maskAwsToken(
                      maskSasToken(
                        maskAwsKeys(text)
                      )
                    )
                  )
                )
              )
            )
          )
        );
      if (CUSTOM_PATTERNS_LENGTH > 0) {
        maskedtxt = maskCustomPattern(maskedtxt);
      }
      if (maskedtxt !== text) {
        masked = true;
      }
    } catch (err) {
      masked = true;
      maskedtxt = err.toString();
      errstr = err.toString();
    }

    result =
    {
      masked: masked,
      maskedtxt: maskedtxt,
      errstr: errstr
    };
    return result;
  };
}

module.exports = SecretDetector;
