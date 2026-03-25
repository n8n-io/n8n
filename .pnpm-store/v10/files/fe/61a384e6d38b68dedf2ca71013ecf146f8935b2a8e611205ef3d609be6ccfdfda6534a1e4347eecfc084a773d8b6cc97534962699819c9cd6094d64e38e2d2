'use strict';

const resolveEventStreamSerdeConfig = (input) => Object.assign(input, {
    eventStreamMarshaller: input.eventStreamSerdeProvider(input),
});

exports.resolveEventStreamSerdeConfig = resolveEventStreamSerdeConfig;
