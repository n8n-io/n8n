#include "node_wrapper.h"
#define V8_AT_LEAST(major, minor, patch) (\
	V8_MAJOR_VERSION > (major) || \
	(V8_MAJOR_VERSION == (major) && V8_MINOR_VERSION > (minor)) || \
	(V8_MAJOR_VERSION == (major) && V8_MINOR_VERSION == (minor) && V8_BUILD_NUMBER >= (patch)) \
)

#ifdef NODE_MODULE_VERSION
#define NODE_MODULE_OR_V8_AT_LEAST(nodejs, v8_major, v8_minor, v8_build) (NODE_MODULE_VERSION >= (nodejs))
#else
#define NODE_MODULE_OR_V8_AT_LEAST(nodejs, v8_major, v8_minor, v8_build) (V8_AT_LEAST(v8_major, v8_minor, v8_build))
#endif
