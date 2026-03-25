# CMake build instructions

## Recommended usage : Incorporating cpu_features into a CMake project

For API / ABI compatibility reasons, it is recommended to build and use
cpu_features in a subdirectory of your project or as an embedded dependency.

This is similar to the recommended usage of the googletest framework
( https://github.com/google/googletest/blob/main/googletest/README.md )

Build and use step-by-step


1- Download cpu_features and copy it in a sub-directory in your project.
or add cpu_features as a git-submodule in your project

2- You can then use the cmake command `add_subdirectory()` to include
cpu_features directly and use the `cpu_features` target in your project.

3- Add the `CpuFeature::cpu_features` target to the `target_link_libraries()` section of
your executable or of your library.

## Disabling tests

CMake default options for cpu_features is `Release` built type with tests
enabled. To disable testing set cmake `BUILD_TESTING` variable to `OFF`.
e.g.
```sh
cmake -S. -Bbuild -DBUILD_TESTING=OFF
```
