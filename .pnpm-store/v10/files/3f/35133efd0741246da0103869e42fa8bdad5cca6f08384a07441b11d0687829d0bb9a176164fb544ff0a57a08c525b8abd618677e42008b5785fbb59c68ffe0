// Copyright (c) 2013 Google Inc. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file is used to generate an empty .pdb -- with a 4KB pagesize -- that is
// then used during the final link for modules that have large PDBs. Otherwise,
// the linker will generate a pdb with a page size of 1KB, which imposes a limit
// of 1GB on the .pdb. By generating an initial empty .pdb with the compiler
// (rather than the linker), this limit is avoided. With this in place PDBs may
// grow to 2GB.
//
// This file is referenced by the msvs_large_pdb mechanism in MSVSUtil.py.
