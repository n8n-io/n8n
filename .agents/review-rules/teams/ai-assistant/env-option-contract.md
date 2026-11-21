Applies to: environment-driven option parsers in packages/@n8n/instance-ai/.

Check tests for mixed case, surrounding whitespace, empty strings, undefined,
and unknown values. Check the operator signal for an unknown value. Do not
silently drop an invalid setting. A warning must identify the setting without
logging secrets. Check that the default remains unchanged when it is unset.
