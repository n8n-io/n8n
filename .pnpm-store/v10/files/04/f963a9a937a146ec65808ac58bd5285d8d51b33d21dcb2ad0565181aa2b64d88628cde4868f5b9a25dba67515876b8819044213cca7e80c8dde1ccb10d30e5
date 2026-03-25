import std.algorithm : each, map, cartesianProduct, filter, joiner, sort, uniq;
import std.array : array;
import std.conv : to;
import std.format;
import std.range : chain, only;
import std.stdio;
import std.traits : EnumMembers;

enum BuildSystem
{
    CMake,
    Bazel
}

enum Cpu
{
    amd64,
    AArch64,
    ARM,
    MIPS,
    POWER,
    RISCV,
    s390x,
}

enum Os
{
    Linux,
    FreeBSD,
    MacOS,
    Windows,
}

struct Badge
{
const:

    Cpu cpu;
    Os os;
    BuildSystem build_system;

    string id()
    {
        return format("%d%c%d", cast(uint)(os) + 1, cast(char)('a' + cpu), cast(uint)(build_system));
    }

    string disabled_image_ref()
    {
        return format("[d%d]", cast(uint)(build_system));
    }

    string link_ref()
    {
        return format("[l%s]", id());
    }

    string image_ref()
    {
        return format("[i%s]", id());
    }

    bool enabled()
    {
        final switch (build_system)
        {
        case BuildSystem.CMake:
            return os == Os.Linux || cpu == Cpu.amd64;
        case BuildSystem.Bazel:
            return os == Os.Linux && cpu == Cpu.amd64;
        }
    }

    string text()
    {
        if (enabled())
            return format("[![]%s]%s", image_ref, link_ref);
        return format("![]%s", disabled_image_ref);
    }

    string disabled_image_link()
    {
        return format("%s: https://img.shields.io/badge/%s-N%%2FA-lightgrey", disabled_image_ref, build_system);
    }

    string filename()
    {
        import std.uni : toLower;

        return toLower(format("%s_%s_%s.yml", cpu, os, build_system));
    }

    string link_decl()
    {
        return format("%s: https://github.com/google/cpu_features/actions/workflows/%s", link_ref, filename());
    }

    string image_decl()
    {
        return format(
            "%s: https://img.shields.io/github/actions/workflow/status/google/cpu_features/%s?branch=main&label=%s", image_ref, filename(), build_system);
    }
}

auto tableHeader(in Cpu[] cpus)
{
    return chain(only("Os"), cpus.map!(to!string)).array;
}

auto tableAlignment(in Cpu[] cpus)
{
    return chain(only(":--"), cpus.map!(v => "--:")).array;
}

auto tableCell(Range)(in Os os, in Cpu cpu, Range badges)
{
    return badges
        .filter!(b => b.cpu == cpu && b.os == os)
        .map!(b => b.text())
        .joiner("<br/>")
        .to!string;
}

auto tableRow(Range)(in Os os, in Cpu[] cpus, Range badges)
{
    return chain(only(os.to!string), cpus.map!(cpu => tableCell(os, cpu, badges))).array;
}

auto tableRows(Range)(in Os[] oses, in Cpu[] cpus, Range badges)
{
    return oses.map!(os => tableRow(os, cpus, badges)).array;
}

auto table(Range)(in Os[] oses, in Cpu[] cpus, Range badges)
{
    return chain(only(tableHeader(cpus)), only(tableAlignment(cpus)), tableRows(oses, cpus, badges));
}

void main()
{
    immutable allCpus = [EnumMembers!Cpu];
    immutable allOses = [EnumMembers!Os];
    immutable allBuildSystems = [EnumMembers!BuildSystem];

    auto badges = cartesianProduct(allCpus, allOses, allBuildSystems).map!(
        t => Badge(t[0], t[1], t[2]));

    writefln("%(|%-( %s |%) |\n%) |", table(allOses, allCpus, badges));
    writeln();
    badges
        .filter!(b => !b.enabled)
        .map!(b => b.disabled_image_link())
        .array
        .sort
        .uniq
        .each!writeln;

    badges
        .filter!(b => b.enabled)
        .map!(b => [b.link_decl(), b.image_decl()])
        .joiner()
        .array
        .sort
        .uniq
        .each!writeln;
}
