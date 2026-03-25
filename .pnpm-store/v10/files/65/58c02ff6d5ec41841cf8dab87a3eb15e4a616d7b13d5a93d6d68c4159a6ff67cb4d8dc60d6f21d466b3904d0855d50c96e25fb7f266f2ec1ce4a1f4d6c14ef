workspace(name = "com_google_cpufeatures")

load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

git_repository(
    name = "com_google_googletest",
    tag = "release-1.11.0",
    remote = "https://github.com/google/googletest.git",
)

git_repository(
    name = "bazel_skylib",
    tag = "1.2.0",
    remote = "https://github.com/bazelbuild/bazel-skylib.git",
)

load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()
