export const isCode = (c) => name.has(c);
export const isName = (c) => code.has(c);
// map types from key to human-friendly name
export const name = new Map([
    ['0', 'File'],
    // same as File
    ['', 'OldFile'],
    ['1', 'Link'],
    ['2', 'SymbolicLink'],
    // Devices and FIFOs aren't fully supported
    // they are parsed, but skipped when unpacking
    ['3', 'CharacterDevice'],
    ['4', 'BlockDevice'],
    ['5', 'Directory'],
    ['6', 'FIFO'],
    // same as File
    ['7', 'ContiguousFile'],
    // pax headers
    ['g', 'GlobalExtendedHeader'],
    ['x', 'ExtendedHeader'],
    // vendor-specific stuff
    // skip
    ['A', 'SolarisACL'],
    // like 5, but with data, which should be skipped
    ['D', 'GNUDumpDir'],
    // metadata only, skip
    ['I', 'Inode'],
    // data = link path of next file
    ['K', 'NextFileHasLongLinkpath'],
    // data = path of next file
    ['L', 'NextFileHasLongPath'],
    // skip
    ['M', 'ContinuationFile'],
    // like L
    ['N', 'OldGnuLongPath'],
    // skip
    ['S', 'SparseFile'],
    // skip
    ['V', 'TapeVolumeHeader'],
    // like x
    ['X', 'OldExtendedHeader'],
]);
// map the other direction
export const code = new Map(Array.from(name).map(kv => [kv[1], kv[0]]));
//# sourceMappingURL=types.js.map