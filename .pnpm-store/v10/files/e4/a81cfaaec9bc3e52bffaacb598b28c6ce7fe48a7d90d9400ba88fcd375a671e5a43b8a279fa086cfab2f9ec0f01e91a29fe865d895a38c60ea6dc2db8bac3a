/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ExponentMapping } from './ExponentMapping';
import { LogarithmMapping } from './LogarithmMapping';
import { MappingError } from './types';
const MIN_SCALE = -10;
const MAX_SCALE = 20;
const PREBUILT_MAPPINGS = Array.from({ length: 31 }, (_, i) => {
    if (i > 10) {
        return new LogarithmMapping(i - 10);
    }
    return new ExponentMapping(i - 10);
});
/**
 * getMapping returns an appropriate mapping for the given scale. For scales -10
 * to 0 the underlying type will be ExponentMapping. For scales 1 to 20 the
 * underlying type will be LogarithmMapping.
 * @param scale a number in the range [-10, 20]
 * @returns {Mapping}
 */
export function getMapping(scale) {
    if (scale > MAX_SCALE || scale < MIN_SCALE) {
        throw new MappingError(`expected scale >= ${MIN_SCALE} && <= ${MAX_SCALE}, got: ${scale}`);
    }
    // mappings are offset by 10. scale -10 is at position 0 and scale 20 is at 30
    return PREBUILT_MAPPINGS[scale + 10];
}
//# sourceMappingURL=getMapping.js.map