PROJECT := cpu_features
BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
SHA1 := $(shell git rev-parse --verify HEAD)

# General commands
.PHONY: help
BOLD=\e[1m
RESET=\e[0m

help:
	@echo -e "${BOLD}SYNOPSIS${RESET}"
	@echo -e "\tmake <target> [NOCACHE=1]"
	@echo
	@echo -e "${BOLD}DESCRIPTION${RESET}"
	@echo -e "\ttest build inside docker container to have a reproductible build."
	@echo
	@echo -e "${BOLD}MAKE TARGETS${RESET}"
	@echo -e "\t${BOLD}help${RESET}: display this help and exit."
	@echo
	@echo -e "\t${BOLD}amd64_<stage>${RESET}: build <stage> docker image using an Ubuntu:latest x86_64 base image."
	@echo -e "\t${BOLD}save_amd64_<stage>${RESET}: Save the <stage> docker image."
	@echo -e "\t${BOLD}sh_amd64_<stage>${RESET}: run a container using the <stage> docker image (debug purpose)."
	@echo -e "\t${BOLD}clean_amd64_<stage>${RESET}: Remove cache and docker image."
	@echo
	@echo -e "\tWith ${BOLD}<stage>${RESET}:"
	@echo -e "\t\t${BOLD}env${RESET}"
	@echo -e "\t\t${BOLD}devel${RESET}"
	@echo -e "\t\t${BOLD}build${RESET}"
	@echo -e "\t\t${BOLD}test${RESET}"
	@echo -e "\t\t${BOLD}install_env${RESET}"
	@echo -e "\t\t${BOLD}install_devel${RESET}"
	@echo -e "\t\t${BOLD}install_build${RESET}"
	@echo -e "\t\t${BOLD}install_test${RESET}"
	@echo -e "\te.g. 'make amd64_build'"
	@echo
	@echo -e "\t${BOLD}<target>_<toolchain_stage>${RESET}: build <stage> docker image for a specific toolchain target."
	@echo -e "\t${BOLD}save_<target>_<toolchain_stage>${RESET}: Save the <stage> docker image for a specific platform."
	@echo -e "\t${BOLD}sh_<target>_<toolchain_stage>${RESET}: run a container using the <stage> docker image specified (debug purpose)."
	@echo -e "\t${BOLD}clean_<target>_<toolchain_stage>${RESET}: Remove cache and docker image."
	@echo
	@echo -e "\tWith ${BOLD}<target>${RESET}:"
	@echo -e "\t\t${BOLD}arm-linux-gnueabihf${RESET} (linaro toolchain)"
	@echo -e "\t\t${BOLD}armv8l-linux-gnueabihf${RESET} (linaro toolchain)"
	@echo -e "\t\t${BOLD}arm-linux-gnueabi${RESET} (linaro toolchain)"
	@echo -e "\t\t${BOLD}armeb-linux-gnueabihf${RESET} (linaro toolchain)"
	@echo -e "\t\t${BOLD}armeb-linux-gnueabi${RESET} (linaro toolchain)"
	@echo -e "\t\t${BOLD}aarch64-linux-gnu${RESET} (linaro toolchain)"
	@echo -e "\t\t${BOLD}aarch64${RESET} (bootlin toolchain)"
	@echo -e "\t\t${BOLD}aarch64_be-linux-gnu${RESET} (linaro toolchain)"
	@echo -e "\t\t${BOLD}aarch64be${RESET} (bootlin toolchain)"
	@echo -e "\t\t${BOLD}mips32${RESET} (codespace toolchain)"
	@echo -e "\t\t${BOLD}mips64${RESET} (codespace toolchain)"
	@echo -e "\t\t${BOLD}mips32el${RESET} (codespace toolchain)"
	@echo -e "\t\t${BOLD}mips64el${RESET} (codespace toolchain)"
	@echo -e "\t\t${BOLD}ppc${RESET} (bootlin toolchain)"
	@echo -e "\t\t${BOLD}ppc64${RESET} (bootlin toolchain)"
	@echo -e "\t\t${BOLD}ppc64le${RESET} (bootlin toolchain)"
	@echo -e "\t\t${BOLD}riscv32${RESET} (bootlin toolchain)"
	@echo -e "\t\t${BOLD}riscv64${RESET} (bootlin toolchain)"
	@echo -e "\t\t${BOLD}s390x${RESET} (bootlin toolchain)"
	@echo
	@echo -e "\tWith ${BOLD}<toolchain_stage>${RESET}:"
	@echo -e "\t\t${BOLD}env${RESET}"
	@echo -e "\t\t${BOLD}devel${RESET}"
	@echo -e "\t\t${BOLD}build${RESET}"
	@echo -e "\t\t${BOLD}test${RESET}"
	@echo -e "\te.g. 'make aarch64_test'"
	@echo
	@echo -e "\t${BOLD}<VM>${RESET}: build the vagrant <VM> virtual machine."
	@echo -e "\t${BOLD}clean_<VM>${RESET}: Remove virtual machine for the specified vm."
	@echo
	@echo -e "\t${BOLD}<VM>${RESET}:"
	@echo -e "\t\t${BOLD}freebsd${RESET} (FreeBSD)"
	@echo
	@echo -e "\t${BOLD}clean${RESET}: Remove cache and ALL docker images."
	@echo
	@echo -e "\t${BOLD}NOCACHE=1${RESET}: use 'docker build --no-cache' when building container (default use cache)."
	@echo
	@echo -e "branch: $(BRANCH)"
	@echo -e "sha1: $(SHA1)"

# Need to add cmd_platform to PHONY otherwise target are ignored since they do not
# contain recipe (using FORCE do not work here)
.PHONY: all
all: build

# Delete all implicit rules to speed up makefile
MAKEFLAGS += --no-builtin-rules
.SUFFIXES:
# Remove some rules from gmake that .SUFFIXES does not remove.
SUFFIXES =
# Keep all intermediate files
# ToDo: try to remove it later
.SECONDARY:

# Docker image name prefix.
IMAGE := ${PROJECT}

ifdef NOCACHE
DOCKER_BUILD_CMD := docker build --no-cache
else
DOCKER_BUILD_CMD := docker build
endif

DOCKER_RUN_CMD := docker run --rm --init --net=host

# $* stem
# $< first prerequist
# $@ target name

############
## NATIVE ##
############
STAGES = env devel build test install_env install_devel install_build install_test

targets_amd64 = $(addprefix amd64_, $(STAGES))
.PHONY: $(targets_amd64)
$(targets_amd64): amd64_%: docker/amd64/Dockerfile
	#@docker image rm -f ${IMAGE}:amd64_$* 2>/dev/null
	${DOCKER_BUILD_CMD} \
 --tag ${IMAGE}:amd64_$* \
 --target=$* \
 -f $< \
 ../..

#$(info Create targets: save_amd64 $(addprefix save_amd64_, $(STAGES)) (debug).)
save_targets_amd64 = $(addprefix save_amd64_, $(STAGES))
.PHONY: $(save_targets_amd64)
$(save_targets_amd64): save_amd64_%: cache/amd64/docker_%.tar
cache/amd64/docker_%.tar: amd64_%
	@rm -f $@
	mkdir -p cache/amd64
	docker save ${IMAGE}:amd64_$* -o $@

#$(info Create targets: $(addprefix sh_amd64_, $(STAGES)) (debug).)
sh_targets_amd64 = $(addprefix sh_amd64_, $(STAGES))
.PHONY: $(sh_targets_amd64)
$(sh_targets_amd64): sh_amd64_%: amd64_%
	${DOCKER_RUN_CMD} -it --name ${IMAGE}_amd64_$* ${IMAGE}:amd64_$*

#$(info Create targets: $(addprefix clean_amd64_, $(STAGES)).)
clean_targets_amd64 = $(addprefix clean_amd64_, $(STAGES))
.PHONY: clean_amd64 $(clean_targets_amd64)
clean_amd64: $(clean_targets_amd64)
$(clean_targets_amd64): clean_amd64_%:
	docker image rm -f ${IMAGE}:amd64_$* 2>/dev/null
	rm -f cache/amd64/docker_$*.tar


###############
## TOOLCHAIN ##
###############
TOOLCHAIN_TARGETS = \
 aarch64 aarch64be \
 arm-linux-gnueabihf armv8l-linux-gnueabihf arm-linux-gnueabi armeb-linux-gnueabihf armeb-linux-gnueabi \
 aarch64-linux-gnu aarch64_be-linux-gnu \
 mips32 mips32el mips64 mips64el \
 ppc ppc64 ppc64le \
 riscv32 riscv64 \
 s390x
TOOLCHAIN_STAGES = env devel build test
define toolchain-stage-target =
#$$(info STAGE: $1)
#$$(info Create targets: toolchain_$1 $(addsuffix _$1, $(TOOLCHAIN_TARGETS)).)
targets_toolchain_$1 = $(addsuffix _$1, $(TOOLCHAIN_TARGETS))
.PHONY: toolchain_$1 $$(targets_toolchain_$1)
toolchain_$1: $$(targets_toolchain_$1)
$$(targets_toolchain_$1): %_$1: docker/toolchain/Dockerfile
	#@docker image rm -f ${IMAGE}:$$*_$1 2>/dev/null
	${DOCKER_BUILD_CMD} \
 --tag ${IMAGE}:$$*_$1 \
 --build-arg TARGET=$$* \
 --target=$1 \
 -f $$< \
 ../..

#$$(info Create targets: save_toolchain_$1 $(addprefix save_, $(addsuffix _$1, $(TOOLCHAIN_TARGETS))) (debug).)
save_targets_toolchain_$1 = $(addprefix save_, $(addsuffix _$1, $(TOOLCHAIN_TARGETS)))
.PHONY: save_toolchain_$1 $$(save_targets_toolchain_$1)
save_toolchain_$1: $$(save_targets_toolchain_$1)
$$(save_targets_toolchain_$1): save_%_$1: cache/%/docker_$1.tar
cache/%/docker_$1.tar: %_$1
	@rm -f $$@
	mkdir -p cache/$$*
	docker save ${IMAGE}:$$*_$1 -o $$@

#$$(info Create targets: $(addprefix sh_, $(addsuffix _$1, $(TOOLCHAIN_TARGETS))) (debug).)
sh_targets_toolchain_$1 = $(addprefix sh_, $(addsuffix _$1, $(TOOLCHAIN_TARGETS)))
.PHONY: $$(sh_targets_toolchain_$1)
$$(sh_targets_toolchain_$1): sh_%_$1: %_$1
	${DOCKER_RUN_CMD} -it --name ${IMAGE}_$$*_$1 ${IMAGE}:$$*_$1

#$$(info Create targets: clean_toolchain_$1 $(addprefix clean_, $(addsuffix _$1, $(TOOLCHAIN_TARGETS))).)
clean_targets_toolchain_$1 = $(addprefix clean_, $(addsuffix _$1, $(TOOLCHAIN_TARGETS)))
.PHONY: clean_toolchain_$1 $$(clean_targets_toolchain_$1)
clean_toolchain_$1: $$(clean_targets_toolchain_$1)
$$(clean_targets_toolchain_$1): clean_%_$1:
	docker image rm -f ${IMAGE}:$$*_$1 2>/dev/null
	rm -f cache/$$*/docker_$1.tar
endef

$(foreach stage,$(TOOLCHAIN_STAGES),$(eval $(call toolchain-stage-target,$(stage))))

## MERGE ##
.PHONY: clean_toolchain
clean_toolchain: $(addprefix clean_toolchain_, $(TOOLCHAIN_STAGES))
	-rmdir $(addprefix cache/, $(TOOLCHAIN_TARGETS))

.PHONY: env devel build test
env: amd64_env toolchain_env
devel: amd64_devel toolchain_devel
build: amd64_build toolchain_build
test: amd64_test toolchain_test

.PHONY: install_env install_devel install_build install_test
install_env: amd64_install_env
install_devel: amd64_install_devel
install_build: amd64_install_build
install_test: amd64_install_test

#############
## VAGRANT ##
#############
VMS = freebsd

vms_targets = $(addsuffix _build, $(VMS))
.PHONY: $(vms_targets)
$(vms_targets): %_build: vagrant/%/Vagrantfile
	@cd vagrant/$* && vagrant destroy -f
	cd vagrant/$* && vagrant up

clean_vms_targets = $(addprefix clean_, $(VMS))
.PHONY: clean_vms $(clean_vms_targets)
clean_vms: $(clean_vms_targets)
$(clean_vms_targets): clean_%:
	cd vagrant/$* && vagrant destroy -f
	-rm -rf vagrant/$*/.vagrant

###########
## CLEAN ##
###########
.PHONY: clean
clean: clean_amd64 clean_toolchain clean_vms
	docker container prune -f
	docker image prune -f
	-rmdir cache

.PHONY: distclean
distclean: clean
	-docker container rm -f $$(docker container ls -aq)
	-docker image rm -f $$(docker image ls -aq)
	-vagrant box remove -f generic/freebsd12
