// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "filesystem_for_testing.h"

#include <cassert>
#include <climits>
#include <cstdio>
#include <cstring>
#include <utility>

namespace cpu_features {

FakeFile::FakeFile(int file_descriptor, const char* content)
    : file_descriptor_(file_descriptor), content_(content) {}

FakeFile::~FakeFile() { assert(!opened_); }

void FakeFile::Open() {
  assert(!opened_);
  opened_ = true;
}

void FakeFile::Close() {
  assert(opened_);
  opened_ = false;
}

int FakeFile::Read(int fd, void* buf, size_t count) {
  assert(count < INT_MAX);
  assert(fd == file_descriptor_);
  const size_t remainder = content_.size() - head_index_;
  const size_t read = count > remainder ? remainder : count;
  memcpy(buf, content_.data() + head_index_, read);
  head_index_ += read;
  assert(read < INT_MAX);
  return (int)read;
}

void FakeFilesystem::Reset() { files_.clear(); }

FakeFile* FakeFilesystem::CreateFile(const std::string& filename,
                                     const char* content) {
  auto& file = files_[filename];
  file =
      std::unique_ptr<FakeFile>(new FakeFile(next_file_descriptor_++, content));
  return file.get();
}

FakeFile* FakeFilesystem::FindFileOrNull(const std::string& filename) const {
  const auto itr = files_.find(filename);
  return itr == files_.end() ? nullptr : itr->second.get();
}

FakeFile* FakeFilesystem::FindFileOrDie(const int file_descriptor) const {
  for (const auto& filename_file_pair : files_) {
    FakeFile* const file_ptr = filename_file_pair.second.get();
    if (file_ptr->GetFileDescriptor() == file_descriptor) {
      return file_ptr;
    }
  }
  assert(false);
  return nullptr;
}

static FakeFilesystem* kFilesystem = new FakeFilesystem();

FakeFilesystem& GetEmptyFilesystem() {
  kFilesystem->Reset();
  return *kFilesystem;
}

extern "C" int CpuFeatures_OpenFile(const char* filename) {
  auto* const file = kFilesystem->FindFileOrNull(filename);
  if (file) {
    file->Open();
    return file->GetFileDescriptor();
  }
  return -1;
}

extern "C" void CpuFeatures_CloseFile(int file_descriptor) {
  kFilesystem->FindFileOrDie(file_descriptor)->Close();
}

extern "C" int CpuFeatures_ReadFile(int file_descriptor, void* buffer,
                                    size_t buffer_size) {
  return kFilesystem->FindFileOrDie(file_descriptor)
      ->Read(file_descriptor, buffer, buffer_size);
}

}  // namespace cpu_features
